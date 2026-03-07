const express = require("express");
const router = express.Router();
const { Session, Submission } = require("../models");
const { extractText } = require("../extractText");
const { evaluateAssignment } = require("../aiService");
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

/**
 * POST /api/student/evaluate
 * Submit assignment for AI evaluation
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
      // If it's a Word doc with no text, it's likely actually empty
      return res.status(400).json({
        success: false,
        message: "Could not extract text from the uploaded document.",
      });
    }

    if (isHandwrittenOrScanned) {
      assignmentText = "[Document is handwritten or scanned. Please analyze the attached file directly.]";
    }

    // Try to find the session for rubric and question paper
    let session = null;
    if (sessionId && sessionId !== "DEMO") {
      session = await Session.findOne({ sessionId: sessionId.toUpperCase() });
    }

    const rubricItems = session?.rubricItems?.length ? session.rubricItems : DEFAULT_RUBRIC;
    const settings = session?.settings || { difficulty: "medium", strictness: "moderate", totalMarks: 10 };
    const questionText = session?.questionPaperText || "";
    const modelAnswerText = session?.modelAnswerText || "";

    // Run AI evaluation
    console.log(`Evaluating assignment for ${studentName} [session: ${sessionId || "DEMO"}]...`);
    const result = await evaluateAssignment({
      assignmentText,
      filePath: req.file.path,
      mimeType: req.file.mimetype,
      questionText,
      modelAnswerText,
      rubricItems,
      settings,
    });

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

    res.json({ success: true, result });
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

module.exports = router;
