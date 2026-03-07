const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const { Session, Submission } = require("../models");
const { extractText } = require("../extractText");
const { evaluateAssignment } = require("../aiService");

// Multer config for student uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads")),
  filename: (req, file, cb) => {
    const uniqueName = `student-${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only PDF and Word documents are allowed"));
  },
});

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
router.post("/evaluate", upload.single("assignment"), async (req, res) => {
  try {
    const { sessionId, studentName } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Assignment file is required." });
    }
    if (!studentName) {
      return res.status(400).json({ success: false, message: "Student name is required." });
    }

    // Extract text from uploaded assignment
    const assignmentText = await extractText(req.file.path);
    if (!assignmentText || assignmentText.length < 20) {
      return res.status(400).json({
        success: false,
        message: "Could not extract text from the uploaded file. Please ensure it is a text-based PDF or Word document.",
      });
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
      questionText,
      modelAnswerText,
      rubricItems,
      settings,
    });

    // Save submission to database
    const submission = new Submission({
      sessionId: sessionId || "DEMO",
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
router.get("/submissions/:sessionId", async (req, res) => {
  try {
    const submissions = await Submission.find({ sessionId: req.params.sessionId }).sort({ evaluatedAt: -1 });
    res.json({ success: true, submissions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
