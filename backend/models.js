const mongoose = require("mongoose");

// Evaluation Session (created by faculty)
const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  subject: { type: String, required: true },
  questionPaperPath: String,
  questionPaperText: String,
  modelAnswerPath: String,
  modelAnswerText: String,
  settings: {
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    strictness: { type: String, enum: ["lenient", "moderate", "strict"], default: "moderate" },
    totalMarks: { type: Number, default: 10 },
  },
  rubricItems: [{
    parameter: String,
    maxMarks: Number,
    description: String,
  }],
  createdAt: { type: Date, default: Date.now },
});

// Submission (by student)
const submissionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  studentName: { type: String, required: true },
  assignmentPath: String,
  assignmentText: String,
  result: {
    totalMarks: Number,
    maxMarks: Number,
    percentage: Number,
    grade: String,
    similarityRisk: String,
    aiComment: String,
    scores: [{
      parameter: String,
      score: Number,
      maxScore: Number,
      feedback: String,
      status: String,
    }],
    improvements: [String],
    strengths: [String],
  },
  evaluatedAt: { type: Date, default: Date.now },
});

const Session = mongoose.model("Session", sessionSchema);
const Submission = mongoose.model("Submission", submissionSchema);

module.exports = { Session, Submission };
