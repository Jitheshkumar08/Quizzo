import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface GeneratedQuestion {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
}

const MCQ_PROMPT = `You are an expert quiz creator. Given the educational text below, generate as many high-quality multiple choice questions as possible that comprehensively cover the key concepts. Each question must have exactly 4 options (A, B, C, D), one clearly correct answer, and a brief explanation of why that answer is correct.

Rules:
- Questions must be clear, unambiguous, and directly based on the provided text
- Distractors (wrong options) must be plausible but clearly incorrect
- Explanations must reference the source material
- Do not repeat questions
- Aim for at least 10 questions, more if the text is substantial
- Output ONLY a valid JSON array — no markdown, no preamble, no trailing text

Output format (strictly):
[
  {
    "question": "...",
    "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
    "correct_answer": "A",
    "explanation": "..."
  }
]

Text:
`;

export async function generateQuestionsFromText(
  text: string
): Promise<GeneratedQuestion[]> {
  // Truncate to ~12000 tokens worth (~48000 chars)
  const truncated = text.slice(0, 48000);

  const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  });

  const result = await model.generateContent(MCQ_PROMPT + truncated);
  const responseText = result.response.text();

  let questions: GeneratedQuestion[];
  try {
    questions = JSON.parse(responseText);
  } catch {
    // Try to extract JSON array from response if any extra text
    const match = responseText.match(/\[[\s\S]*\]/);
    if (!match) throw new Error("Failed to parse AI response as JSON");
    questions = JSON.parse(match[0]);
  }

  if (!Array.isArray(questions)) {
    throw new Error("AI did not return an array of questions");
  }

  return questions;
}
