const mongoose = require("mongoose");

// User Account
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["teacher", "student"], required: true },
  avatarUrl: { type: String, default: "" }, // Cloudinary URL
  createdAt: { type: Date, default: Date.now },
});

// Evaluation Session (created by teacher)
const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  subject: { type: String, required: true },
  questionPaperPath: String, // Storing cloudinary URL
  questionPaperText: String,
  modelAnswerPath: String, // Storing cloudinary URL
  modelAnswerText: String,
  settings: {
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    strictness: { type: String, enum: ["lenient", "moderate", "strict"], default: "moderate" },
    totalMarks: { type: Number, default: 10 },
    // Multi-model settings
    models: { type: [String], default: ["gemini"] }, // ['gemini', 'openai', 'anthropic']
    evaluationStrategy: { type: String, enum: ["average", "best"], default: "average" },
  },
  rubricItems: [{
    parameter: String,
    maxMarks: Number,
    description: String,
  }],
  createdAt: { type: Date, default: Date.now },
});

// Individual model result sub-schema
const modelResultSchema = new mongoose.Schema({
  model: { type: String }, // 'gemini' | 'openai' | 'anthropic'
  status: { type: String, enum: ["success", "failed"], default: "success" },
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
  strengths: [String],
  improvements: [String],
  error: String, // if failed
}, { _id: false });

// Submission (by student)
const submissionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
    // Multi-model metadata
    modelResults: [modelResultSchema],
    evaluationStrategy: { type: String, default: "average" }, // 'average' | 'best'
    modelsUsed: [String],     // which models successfully ran
    bestModel: String,        // which model's result was selected (for 'best' strategy)
  },
  evaluatedAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Session = mongoose.model("Session", sessionSchema);
const Submission = mongoose.model("Submission", submissionSchema);

module.exports = { User, Session, Submission };
