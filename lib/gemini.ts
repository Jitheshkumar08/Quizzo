import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface GeneratedQuestion {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
}

const MCQ_PROMPT = `You are a strict data extraction engine. I am providing you with the text of an exam paper or quiz document that ALREADY CONTAINS multiple-choice questions.

Your single task is to EXTRACT EVERY SINGLE multiple-choice question found in this text and format it into a JSON array. 

CRITICAL RULES:
1. DO NOT INVENT OR GENERATE new questions. Only extract the ones that actually exist in the text.
2. VERBATIM EXTRACTION: You must extract the exact wording of the question and the exact wording of the 4 options (A, B, C, D) letter-for-letter, space-for-space. Do not alter, rephrase, or "clean up" the text.
3. DO NOT STOP EARLY. If there are 100 questions in the text, your JSON array MUST contain exactly 100 questions. Continue extracting until the absolute end of the document.
4. If the text provides the correct answer, use it. If the correct answer is NOT provided, deduce it to the best of your ability.
5. EXPLANATIONS MUST BE AN EMPTY STRING (""). Do not generate explanations! This is critical to save tokens so you do not get cut off before finishing all questions.
6. Output ONLY a valid JSON array — no markdown blocks (\`\`\`json), no preamble, no trailing text.

Output format (strictly):
[
  {
    "question": "Exact text of the question...",
    "options": { "A": "Exact text...", "B": "Exact text...", "C": "Exact text...", "D": "Exact text..." },
    "correct_answer": "A",
    "explanation": ""
  }
]

Text:
`;

export async function generateQuestionsFromText(
  text: string
): Promise<GeneratedQuestion[]> {
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  });

  const result = await model.generateContent(MCQ_PROMPT + text);
  const responseText = result.response.text();

  let questions: GeneratedQuestion[];
  try {
    questions = JSON.parse(responseText);
  } catch {
    // If JSON parsing fails, it's likely because the output hit the 8192 token limit and was truncated.
    // We will attempt to repair the truncated JSON array by closing the last complete object.
    let cleanedText = responseText.trim();

    // Strip markdown formatting if the model ignored responseMimeType
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.replace(/^```json/, "").replace(/```$/, "").trim();
    }

    if (!cleanedText.endsWith("]")) {
      console.warn("[JSON REPAIR] Output truncated. Attempting to repair...");
      const lastBraceIndex = cleanedText.lastIndexOf("}");
      if (lastBraceIndex !== -1) {
        // Cut off the incomplete trailing part and close the array
        cleanedText = cleanedText.substring(0, lastBraceIndex + 1) + "\n]";
      } else {
        throw new Error("Failed to parse AI response: Output completely malformed.");
      }
    }

    try {
      questions = JSON.parse(cleanedText);
    } catch (innerError) {
      console.error("[JSON REPAIR FAILED]", cleanedText);
      throw new Error("Failed to parse AI response as JSON even after repair attempt.");
    }
  }

  if (!Array.isArray(questions)) {
    throw new Error("AI did not return an array of questions");
  }

  return questions;
}
