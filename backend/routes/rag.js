const express = require("express");
const router = express.Router();
const axios = require("axios");
const { Submission } = require("../models");
const { authMiddleware } = require("../middleware/auth");

/**
 * Build a rich context string from a submission result for RAG prompting
 */
function buildSubmissionContext(submission) {
  const r = submission.result;
  if (!r) return "No evaluation data found.";

  const scoreLines = (r.scores || [])
    .map(s => `  - ${s.parameter}: ${s.score}/${s.maxScore} (${s.status?.toUpperCase()}) — ${s.feedback}`)
    .join("\n");

  const strengthLines = (r.strengths || []).map((s, i) => `  ${i + 1}. ${s}`).join("\n");
  const improvLines = (r.improvements || []).map((s, i) => `  ${i + 1}. ${s}`).join("\n");

  const modelResultLines = (r.modelResults || [])
    .filter(m => m.status === "success")
    .map(m => `  - ${m.model?.toUpperCase()}: ${m.totalMarks}/${m.maxMarks} (${m.percentage}%) — ${m.aiComment || ""}`)
    .join("\n");

  return `
STUDENT EVALUATION REPORT
===========================
Student: ${submission.studentName}
Session ID: ${submission.sessionId}
Evaluated On: ${new Date(submission.evaluatedAt).toLocaleDateString("en-IN", { dateStyle: "long" })}

FINAL RESULT:
  Total Marks: ${r.totalMarks} / ${r.maxMarks}
  Percentage: ${r.percentage}%
  Grade: ${r.grade}
  Similarity Risk: ${r.similarityRisk?.toUpperCase()}
  Evaluation Strategy: ${r.evaluationStrategy || "single model"}
  Models Used: ${(r.modelsUsed || []).join(", ") || "N/A"}
  ${r.bestModel ? `Best Model Selected: ${r.bestModel}` : ""}

AI OVERALL COMMENT:
  "${r.aiComment}"

DETAILED RUBRIC SCORES:
${scoreLines}

STRENGTHS IDENTIFIED:
${strengthLines}

IMPROVEMENT SUGGESTIONS:
${improvLines}

${modelResultLines ? `INDIVIDUAL MODEL RESULTS:\n${modelResultLines}` : ""}

ASSIGNMENT TEXT (excerpt):
${(submission.assignmentText || "").substring(0, 1500)}
  `.trim();
}

/**
 * POST /api/rag/chat
 * RAG-based chat — student asks questions about their evaluation
 * Body: { submissionId: string, question: string, history: [{role, content}] }
 */
router.post("/chat", authMiddleware, async (req, res) => {
  try {
    const { submissionId, question, history = [] } = req.body;

    if (!submissionId || !question?.trim()) {
      return res.status(400).json({ success: false, message: "submissionId and question are required." });
    }

    // Fetch submission from DB
    const submission = await Submission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ success: false, message: "Submission not found." });
    }

    // Access check: student can only query their own submission
    if (req.user.role === "student" && submission.studentId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    // Build rich context from submission data (RAG)
    const context = buildSubmissionContext(submission);

    // Build conversation history for multi-turn support
    const historyText = history.length > 0
      ? history.slice(-6).map(m => `${m.role === "user" ? "Student" : "AI Tutor"}: ${m.content}`).join("\n")
      : "";

    const systemPrompt = `You are a helpful and empathetic AI tutor helping a student understand their assignment evaluation results. 
You have access to the student's complete evaluation report below. Use this information to answer their questions accurately and helpfully.
Always be encouraging, specific, and constructive. Reference the exact rubric scores and feedback when relevant.
If the student asks something unrelated to their evaluation, politely redirect them to focus on their assignment feedback.
Respond in the same language the student uses (Hindi or English).

EVALUATION CONTEXT:
${context}`;

    const userMessage = historyText
      ? `Previous conversation:\n${historyText}\n\nStudent's new question: ${question}`
      : question;

    // Use Gemini Flash for RAG chat (fast and cost-effective)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res.status(503).json({ success: false, message: "AI chat service is not configured." });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
    const response = await axios.post(url, {
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemPrompt}\n\n---\n\nStudent Question: ${userMessage}` }]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024,
      },
    });

    const answer = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!answer) throw new Error("Empty response from AI");

    res.json({ success: true, answer: answer.trim() });
  } catch (err) {
    console.error("RAG Chat error:", err.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: err.response?.data?.error?.message || err.message || "AI chat failed.",
    });
  }
});

module.exports = router;
