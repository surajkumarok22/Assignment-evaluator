# AI Assignment Evaluator

An AI-powered assignment evaluation system built with **Next.js**, **Node.js/Express**, and **Anthropic Claude / OpenAI / Gemini**.

## Features

- 🤖 **AI-powered evaluation** using LLMs (Claude, GPT-4, Gemini)
- 📋 **Rubric-based controlled prompting** to reduce hallucination
- 👩‍🏫 **Faculty Portal** — create sessions, upload rubrics, set difficulty/strictness
- 🎓 **Student Portal** — upload assignments, get instant detailed feedback
- 📊 **Radar chart analytics** — visual breakdown of all evaluation parameters
- 📝 **Detailed feedback** — strengths, improvements, per-parameter scoring
- 🔍 **Similarity risk detection** — flags potential plagiarism or AI use

---

## Project Structure

```
ai-assignment-evaluator/
├── frontend/          # Next.js 14 app with shadcn/ui
└── backend/           # Express.js REST API
```

---

## Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add your API key
npm run dev
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Open

Visit **http://localhost:3000**

---

## Environment Variables (Backend)

Copy `backend/.env.example` to `backend/.env` and configure:

| Variable | Description | Example |
|---|---|---|
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/ai-evaluator` |
| `AI_PROVIDER` | AI provider to use | `anthropic` |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | `sk-ant-...` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |

> **Note:** You only need ONE AI provider key. The system defaults to Anthropic Claude.

---

## AI Providers

The backend supports three AI providers. Set `AI_PROVIDER` in `.env`:

- **`anthropic`** — Claude Sonnet (recommended, best for structured JSON output)
- **`openai`** — GPT-4o Mini (good, cost-effective)
- **`gemini`** — Gemini 1.5 Flash (fast, free tier available)

---

## Demo Mode

If no backend is running or no API key is set:
- The **frontend still works** with built-in demo data
- Faculty can create mock sessions
- Students see a realistic sample evaluation result

---

## API Endpoints

### Faculty
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/faculty/create-session` | Create evaluation session |
| `GET` | `/api/faculty/sessions` | List all sessions |
| `GET` | `/api/faculty/session/:id` | Get session details |

### Student
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/student/evaluate` | Submit assignment for evaluation |
| `GET` | `/api/student/submissions/:sessionId` | Get all submissions for a session |

---

## Evaluation Parameters

| Parameter | Description |
|---|---|
| Concept Accuracy | Are the concepts correct? |
| Completeness | Are all parts answered? |
| Relevance | Is the answer on-topic? |
| Language Quality | Grammar & clarity |
| Structure | Intro → Body → Conclusion |
| Similarity Risk | Plagiarism / AI-use detection |

---

## Tech Stack

**Frontend:** Next.js 14, React, Tailwind CSS, shadcn/ui, Recharts, React Dropzone

**Backend:** Node.js, Express.js, Mongoose, Multer, pdf-parse, mammoth

**AI:** Anthropic Claude / OpenAI GPT / Google Gemini

**Database:** MongoDB

---

## Viva Points

> "We use **rubric-based controlled prompting** to reduce hallucination and ensure consistent scoring across all evaluation parameters."

> "The system supports **multiple AI providers** (Claude, GPT-4, Gemini) with a unified evaluation interface."

> "Text extraction handles both **PDF and DOCX** formats, making it compatible with standard assignment submission formats."
# Assignment-evaluator
