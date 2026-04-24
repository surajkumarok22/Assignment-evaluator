const Anthropic = require("@anthropic-ai/sdk");
const axios = require("axios");
const fs = require("fs");

/**
 * Builds the evaluation prompt using rubric-based controlled prompting
 * to reduce hallucination and ensure consistent scoring.
 */
function buildEvaluationPrompt({ assignmentText, questionText, modelAnswerText, rubricItems, settings, filePath }) {
  const rubricStr = rubricItems
    .map((r, i) => `${i + 1}. ${r.parameter} (max ${r.maxMarks} marks): ${r.description}`)
    .join("\n");

  const totalMaxMarks = rubricItems.reduce((sum, r) => sum + r.maxMarks, 0);

  const strictnessInstructions = {
    lenient: "Be lenient - focus on core understanding, award partial marks generously if the concept is grasped.",
    moderate: "Be balanced - award full marks only if the answer is complete and accurate, partial marks for partial understanding.",
    strict: "Be strict - deduct marks for any inaccuracies, incomplete explanations, or poor language.",
  };

  const difficultyContext = {
    easy: "This is a beginner-level assignment. Expect basic conceptual answers.",
    medium: "This is an intermediate-level assignment. Expect clear explanations with examples.",
    hard: "This is an advanced-level assignment. Expect in-depth analysis, edge cases, and critical thinking.",
  };

  return `You are an expert academic evaluator with 15+ years of experience in ${settings.difficulty || "medium"} level education.

DIFFICULTY CONTEXT: ${difficultyContext[settings.difficulty] || difficultyContext.medium}
STRICTNESS LEVEL: ${strictnessInstructions[settings.strictness] || strictnessInstructions.moderate}

${questionText ? `QUESTION PAPER:\n${questionText}\n` : ""}

${modelAnswerText ? `MODEL ANSWER (use as reference, not as exact match requirement):\n${modelAnswerText}\n` : ""}

STUDENT ASSIGNMENT TO EVALUATE:
${filePath ? "Part 1 of the prompt contains the student assignment file (PDF/Image)." : ""}

EVALUATION RUBRIC (Total: ${totalMaxMarks} marks):
${rubricStr}

INSTRUCTIONS:
1. CRITICAL: You must strictly correlate the student's assignment against the QUESTION PAPER and the MODEL ANSWER provided.
2. Do not grade the student's assignment in isolation. Check if their answers actually solve the exact questions asked in the Question Paper.
3. Compare their facts, formulas, and conceptual explanations directly against the Model Answer. Penalize hallucinated, irrelevant, or factually incorrect information that deviates from the Model Answer.
4. Carefully analyze the student's assignment (read the attached document if provided). It may contain handwritten text; do your best to transcribe it accurately.
5. Evaluate the student's assignment against each rubric parameter. Be highly accurate, objective, and reference where they succeeded or failed to match the Model Answer.
6. Award marks strictly within the max marks for each parameter based on this factual correlation.
7. Provide specific, constructive, and detailed feedback for each parameter specifically referencing how it compares to the model answer.
5. Detect similarity risk (low/medium/high) — check if the text looks AI-generated or copied.
6. List 3-5 specific strengths.
7. List 3-5 actionable improvement suggestions.
7. Write a brief overall comment (2-3 sentences)
8. Calculate grade: A+ (95-100%), A (85-94%), B+ (75-84%), B (65-74%), C (50-64%), D (35-49%), F (<35%)

YOU MUST RESPOND IN VALID JSON FORMAT ONLY. No markdown, no explanation outside JSON.

{
  "scores": [
    {
      "parameter": "parameter name",
      "score": <number within max>,
      "maxScore": <max marks>,
      "feedback": "specific detailed feedback",
      "status": "good|partial|poor"
    }
  ],
  "totalMarks": <sum of scores>,
  "maxMarks": ${totalMaxMarks},
  "percentage": <totalMarks/maxMarks * 100>,
  "grade": "A+|A|B+|B|C|D|F",
  "similarityRisk": "low|medium|high",
  "aiComment": "overall 2-3 sentence assessment",
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3", "improvement4", "improvement5"]
}`;
}

/**
 * Call Anthropic Claude API
 */
async function callAnthropicAPI(prompt) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });
  return message.content[0].text;
}

/**
 * Call OpenAI API
 */
async function callOpenAIAPI(prompt) {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert academic evaluator. Always respond in valid JSON format only." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    },
    { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" } }
  );
  return response.data.choices[0].message.content;
}

/**
 * Call Google Gemini API
 */
async function callGeminiAPI(prompt, filePaths) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const parts = [];

  const addFilePart = async (fPath, mType) => {
    if (!fPath) return;
    const supportedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    let finalMimeType = mType || 'application/pdf';

    if (fPath.includes('.pdf')) finalMimeType = 'application/pdf';
    else if (fPath.match(/\.(jpeg|jpg|png|webp)$/i)) {
      if (fPath.includes('.png')) finalMimeType = 'image/png';
      else if (fPath.includes('.webp')) finalMimeType = 'image/webp';
      else finalMimeType = 'image/jpeg';
    }

    if (supportedMimes.includes(finalMimeType)) {
      let base64Data;
      try {
        if (fPath.startsWith('http')) {
          const response = await axios.get(fPath, { responseType: 'arraybuffer' });
          base64Data = Buffer.from(response.data).toString('base64');
        } else if (fs.existsSync(fPath)) {
          base64Data = fs.readFileSync(fPath).toString('base64');
        }
      } catch (e) {
        console.error("Error fetching file for Gemini:", fPath, e.message);
      }

      if (base64Data) {
        parts.push({
          inlineData: {
            mimeType: finalMimeType,
            data: base64Data
          }
        });
      }
    }
  };

  // 1. Add student assignment
  await addFilePart(filePaths.assignmentPath, filePaths.assignmentMimeType);
  // 2. Add question paper
  if (filePaths.questionPath) await addFilePart(filePaths.questionPath, null);
  // 3. Add model answer
  if (filePaths.modelAnswerPath) await addFilePart(filePaths.modelAnswerPath, null);

  parts.push({ text: prompt });

  const response = await axios.post(url, {
    contents: [{ role: "user", parts: parts }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 8192, responseMimeType: "application/json" },
  });
  return response.data.candidates[0].content.parts[0].text;
}

/**
 * Parse and validate JSON response from any AI model
 */
function parseAIResponse(rawResponse) {
  let jsonStr = rawResponse;
  const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) jsonStr = jsonMatch[0];

  const result = JSON.parse(jsonStr);
  if (!result.scores || !Array.isArray(result.scores)) {
    throw new Error("Invalid response structure: missing scores array");
  }
  // Ensure percentage is rounded to 2 decimal places
  if (result.percentage) result.percentage = Math.round(result.percentage * 100) / 100;
  return result;
}

/**
 * Determine which AI model display label to use
 */
const MODEL_LABELS = {
  gemini: "Gemini",
  openai: "GPT-4o",
  anthropic: "Claude",
};

/**
 * Run a single model evaluation — returns { model, status, result | error }
 */
async function runSingleModel(modelName, prompt, filePaths) {
  try {
    let rawResponse;
    if (modelName === "gemini" && process.env.GEMINI_API_KEY) {
      rawResponse = await callGeminiAPI(prompt, filePaths || {});
    } else if (modelName === "openai" && process.env.OPENAI_API_KEY) {
      rawResponse = await callOpenAIAPI(prompt);
    } else if (modelName === "anthropic" && process.env.ANTHROPIC_API_KEY) {
      rawResponse = await callAnthropicAPI(prompt);
    } else {
      return { model: modelName, status: "failed", error: `No API key configured for ${modelName}` };
    }

    const result = parseAIResponse(rawResponse);
    return { model: modelName, status: "success", result };
  } catch (err) {
    console.error(`[${MODEL_LABELS[modelName] || modelName}] Evaluation failed:`, err.message);
    return { model: modelName, status: "failed", error: err.message };
  }
}

/**
 * Aggregate multiple model results using "average" strategy:
 * - Per-parameter scores are averaged across successful models
 * - aiComment & feedback come from the model with the highest score
 */
function aggregateAverage(successfulResults) {
  if (successfulResults.length === 1) return successfulResults[0].result;

  // Build parameter map: param name -> array of { score, maxScore, feedback, status }
  const paramMap = {};
  for (const { result } of successfulResults) {
    for (const s of result.scores) {
      if (!paramMap[s.parameter]) paramMap[s.parameter] = [];
      paramMap[s.parameter].push(s);
    }
  }

  // Average each parameter
  const avgScores = Object.entries(paramMap).map(([parameter, entries]) => {
    const avgScore = entries.reduce((sum, e) => sum + e.score, 0) / entries.length;
    const maxScore = entries[0].maxScore;
    const pct = avgScore / maxScore;
    const status = pct >= 0.75 ? "good" : pct >= 0.5 ? "partial" : "poor";
    // Use feedback from best-scoring entry for this param
    const bestEntry = entries.reduce((a, b) => a.score >= b.score ? a : b);
    return {
      parameter,
      score: Math.round(avgScore * 10) / 10,
      maxScore,
      feedback: bestEntry.feedback,
      status,
    };
  });

  const totalMarks = Math.round(avgScores.reduce((sum, s) => sum + s.score, 0) * 10) / 10;
  const maxMarks = avgScores.reduce((sum, s) => sum + s.maxScore, 0);
  const percentage = Math.round((totalMarks / maxMarks) * 10000) / 100;

  // Grade from percentage
  const grade =
    percentage >= 95 ? "A+" :
    percentage >= 85 ? "A" :
    percentage >= 75 ? "B+" :
    percentage >= 65 ? "B" :
    percentage >= 50 ? "C" :
    percentage >= 35 ? "D" : "F";

  // For comment, strengths, improvements — use the result with highest total marks
  const bestResult = successfulResults.reduce((a, b) =>
    a.result.totalMarks >= b.result.totalMarks ? a : b
  ).result;

  // Average similarityRisk
  const riskMap = { low: 0, medium: 1, high: 2 };
  const avgRisk = successfulResults.reduce((sum, r) => sum + (riskMap[r.result.similarityRisk] || 0), 0) / successfulResults.length;
  const similarityRisk = avgRisk < 0.5 ? "low" : avgRisk < 1.5 ? "medium" : "high";

  return {
    scores: avgScores,
    totalMarks,
    maxMarks,
    percentage,
    grade,
    similarityRisk,
    aiComment: bestResult.aiComment,
    strengths: bestResult.strengths,
    improvements: bestResult.improvements,
  };
}

/**
 * Aggregate multiple model results using "best" strategy:
 * - Pick the model with the highest totalMarks (most detailed/generous evaluation)
 */
function aggregateBest(successfulResults) {
  const best = successfulResults.reduce((a, b) =>
    a.result.totalMarks >= b.result.totalMarks ? a : b
  );
  return { ...best.result, _bestModel: best.model };
}

/**
 * Main multi-model evaluation function
 * @param {object} params - Same as evaluateAssignment params
 * @param {object} modelConfig - { models: ['gemini','openai','anthropic'], strategy: 'average'|'best' }
 */
async function evaluateWithMultipleModels(params, modelConfig = {}) {
  const requestedModels = modelConfig.models?.length ? modelConfig.models : ["gemini"];
  const strategy = modelConfig.strategy || "average";

  const prompt = buildEvaluationPrompt(params);
  const filePaths = {
    assignmentPath: params.filePath,
    assignmentMimeType: params.mimeType,
    questionPath: params.questionPath,
    modelAnswerPath: params.modelAnswerPath,
  };

  console.log(`🤖 Running evaluation with models: [${requestedModels.join(", ")}] | Strategy: ${strategy}`);

  // Run all models in parallel
  const modelPromises = requestedModels.map(model => runSingleModel(model, prompt, filePaths));
  const rawResults = await Promise.allSettled(modelPromises);

  // Unwrap allSettled (runSingleModel never throws, so all should be fulfilled)
  const modelResults = rawResults.map(r => r.status === "fulfilled" ? r.value : { model: "unknown", status: "failed", error: r.reason?.message });

  const successfulResults = modelResults.filter(r => r.status === "success");
  const failedModels = modelResults.filter(r => r.status === "failed");

  if (failedModels.length > 0) {
    console.warn(`⚠️  Failed models: ${failedModels.map(f => `${f.model} (${f.error})`).join(", ")}`);
  }

  if (successfulResults.length === 0) {
    throw new Error(`All AI models failed to evaluate. Errors: ${failedModels.map(f => f.error).join("; ")}`);
  }

  console.log(`✅ Successful models: [${successfulResults.map(r => r.model).join(", ")}]`);

  // Aggregate results based on strategy
  let finalResult;
  let bestModel = null;

  if (strategy === "best") {
    const aggregated = aggregateBest(successfulResults);
    bestModel = aggregated._bestModel;
    delete aggregated._bestModel;
    finalResult = aggregated;
  } else {
    finalResult = aggregateAverage(successfulResults);
  }

  // Attach multi-model metadata
  finalResult.modelResults = modelResults.map(r => ({
    model: r.model,
    status: r.status,
    totalMarks: r.result?.totalMarks,
    maxMarks: r.result?.maxMarks,
    percentage: r.result?.percentage,
    grade: r.result?.grade,
    similarityRisk: r.result?.similarityRisk,
    aiComment: r.result?.aiComment,
    scores: r.result?.scores,
    strengths: r.result?.strengths,
    improvements: r.result?.improvements,
    error: r.error,
  }));
  finalResult.evaluationStrategy = strategy;
  finalResult.modelsUsed = successfulResults.map(r => r.model);
  if (bestModel) finalResult.bestModel = bestModel;

  return finalResult;
}

/**
 * Legacy single-model evaluation (backward compat)
 */
async function evaluateAssignment(params) {
  const provider = process.env.AI_PROVIDER || "gemini";
  return evaluateWithMultipleModels(params, { models: [provider], strategy: "average" });
}

module.exports = { evaluateAssignment, evaluateWithMultipleModels };
