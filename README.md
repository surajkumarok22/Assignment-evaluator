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


