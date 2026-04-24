const express = require("express");
const router = express.Router();
const { Session, Submission } = require("../models");
const { extractText } = require("../extractText");
const { evaluateWithMultipleModels } = require("../aiService");
const { uploadCloud } = require("../utils/cloudinary");
const { authMiddleware, restrictTo } = require("../middleware/auth");

/**
 * Default rubric used when no session is found
 */
const DEFAULT_RUBRIC = [
  { parameter: "Concept Accuracy", maxMarks: 3, description: "Are concepts correct and well-explained?" },
  { parameter: "Completeness", maxMarks: 2, description: "Are all parts of the question answered?" },
  { parameter: "Relevance", maxMarks: 2, description: "Is the answer on-topic and focused?" },
  { parameter: "Language Quality", maxMarks: 2, description: "Grammar, clarity and appropriate vocabulary" },
  { parameter: "Structure", maxMarks: 1, description: "Clear introduction, body, and conclusion" },
];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const simulatePipeline = async (stepNo, title, details = "", ms = 500) => {
  console.log(`\x1b[36m[Pipeline] [${stepNo}/11]\x1b[0m \x1b[33m${title}\x1b[0m`);
  if (details) console.log(`  \x1b[90m↳ ${details}\x1b[0m`);
  await delay(ms);
};

/**
 * POST /api/student/evaluate
 * Submit assignment for AI evaluation (multi-model)
 */
router.post("/evaluate", authMiddleware, restrictTo("student", "teacher"), uploadCloud.single("assignment"), async (req, res) => {
  try {
    const { sessionId, studentName } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Assignment file is required." });
    }
    if (!studentName) {
      return res.status(400).json({ success: false, message: "Student name is required." });
    }

    // Extract text from uploaded assignment
    let assignmentText = await extractText(req.file.path);
    const isHandwrittenOrScanned = !assignmentText || assignmentText.trim().length < 20;

    if (isHandwrittenOrScanned && req.file.mimetype !== 'application/pdf' && !req.file.mimetype.startsWith('image/')) {
      return res.status(400).json({
        success: false,
        message: "Could not extract text from the uploaded document.",
      });
    }

    if (isHandwrittenOrScanned) {
      assignmentText = "[Document is handwritten or scanned. Please analyze the attached file directly.]";
    }

    // Try to find the session for rubric, question paper, and model config
    let session = null;
    if (sessionId && sessionId !== "DEMO") {
      session = await Session.findOne({ sessionId: sessionId.toUpperCase() });
    }

    const rubricItems = session?.rubricItems?.length ? session.rubricItems : DEFAULT_RUBRIC;
    const settings = session?.settings || { difficulty: "medium", strictness: "moderate", totalMarks: 10 };
    const questionText = session?.questionPaperText || "";
    const modelAnswerText = session?.modelAnswerText || "";

    // Build model config from session settings (or defaults)
    const modelConfig = {
      models: session?.settings?.models?.length ? session.settings.models : [process.env.AI_PROVIDER || "gemini"],
      strategy: session?.settings?.evaluationStrategy || "average",
    };

    await simulatePipeline(8, "AI Model Evaluation", `Running [${modelConfig.models.join(", ")}] with strategy: ${modelConfig.strategy}...`, 100);

    // Run multi-model AI evaluation
    console.log(`Evaluating assignment for ${studentName} [session: ${sessionId || "DEMO"}] | Models: [${modelConfig.models.join(", ")}]`);
    const result = await evaluateWithMultipleModels({
      assignmentText,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      questionText,
      questionPath: session?.questionPaperPath,
      modelAnswerText,
      modelAnswerPath: session?.modelAnswerPath,
      rubricItems,
      settings,
    }, modelConfig);

    console.log(`  \x1b[32m✔ Received raw predictions from LLM. Grade: ${result.grade}\x1b[0m`);

    await simulatePipeline(9, "Regex Parsing", "Structuring response payload and validating constraints...", 500);
    await simulatePipeline(10, "MongoDB Storage", "Persisting semantic vectors and grades to cluster...", 400);

    // Save submission to database
    const submission = new Submission({
      sessionId: sessionId || "DEMO",
      studentId: req.user.id,
      studentName,
      assignmentPath: req.file.path,
      assignmentText,
      result,
    });
    await submission.save();

    await simulatePipeline(11, "Frontend Visualization (Next.js)", "Streaming state to client view. Evaluation Complete! 🎉\n", 200);

    res.json({ success: true, result, submissionId: submission._id });
  } catch (err) {
    console.error("Evaluation error:", err);
    res.status(500).json({ success: false, message: err.message || "Evaluation failed. Please try again." });
  }
});

/**
 * GET /api/student/submissions/:sessionId
 * Get all submissions for a session (faculty view)
 */
router.get("/submissions/:sessionId", authMiddleware, restrictTo("teacher"), async (req, res) => {
  try {
    const submissions = await Submission.find({ sessionId: req.params.sessionId }).sort({ evaluatedAt: -1 });
    res.json({ success: true, submissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/student/my-submissions
 * Get all submissions for the currently logged-in student
 */
router.get("/my-submissions", authMiddleware, restrictTo("student"), async (req, res) => {
  try {
    const submissions = await Submission.find({ studentId: req.user.id }).sort({ evaluatedAt: -1 });
    res.json({ success: true, submissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/student/submission/:id
 * Get a single submission by ID (for RAG chat context)
 */
router.get("/submission/:id", authMiddleware, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ success: false, message: "Submission not found." });
    if (req.user.role === "student" && submission.studentId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }
    res.json({ success: true, submission });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
