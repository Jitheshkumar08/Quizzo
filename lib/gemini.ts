import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY || process.env.GEMINI_API_KEY, // Fallback if they didn't rename it yet
  baseURL: "https://integrate.api.nvidia.com/v1",
});

const MODEL = "meta/llama-3.1-70b-instruct";

export interface GeneratedQuestion {
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct_answer: "A" | "B" | "C" | "D";
  explanation: string;
}

const MCQ_PROMPT_TEMPLATE = (start: number, end: number) => `You are a strict data extraction engine. 
I am providing you with the text of an exam paper or quiz document that ALREADY CONTAINS multiple-choice questions.

Your task is to EXTRACT ONLY questions ${start} through ${end} from the provided text and format them into a JSON array.

CRITICAL RULES:
1. DO NOT INVENT OR GENERATE new questions. Only extract the ones that actually exist in the text.
2. VERBATIM EXTRACTION: You must extract the exact wording of the question and the exact wording of the 4 options (A, B, C, D) letter-for-letter, space-for-space.
3. EXTRACT EXACTLY THE REQUESTED RANGE. You must start at question number ${start} and stop exactly after extracting question number ${end}.
4. Output ONLY a valid JSON array. No preamble, no markdown formatting blocks, no trailing text.
5. EXPLANATIONS MUST BE AN EMPTY STRING ("").

Output format (strictly a JSON object with a "questions" array):
{
  "questions": [
    {
      "question": "Exact text...",
      "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correct_answer": "A",
      "explanation": ""
    }
  ]
}

Text:
`;

export async function getTotalQuestionsCount(text: string): Promise<number> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: `Quickly scan the following text and count the EXACT total number of multiple-choice questions present. Output ONLY a valid JSON object with the count. Example: {"count": 10}\n\nText:\n${text.slice(0, 40000)}`,
        },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    return parsed.count || 0;
  } catch (error) {
    console.error("[NVIDIA COUNT ERROR]", error);
    return 0;
  }
}

export async function generateQuestionsFromText(
  text: string,
  start: number,
  end: number
): Promise<GeneratedQuestion[]> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: MCQ_PROMPT_TEMPLATE(start, end) + text.slice(0, 40000),
        },
      ],
      temperature: 0.2,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });

    let responseText = response.choices[0]?.message?.content?.trim() || "[]";
    
    // NVIDIA sometimes wraps json in an object if response_format is used
    // or it might just be the array. Let's be safe.
    let questions: unknown;
    try {
      const parsed = JSON.parse(responseText);
      questions = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.data || []);
    } catch (e) {
      // Fallback: cleaning markdown
      if (responseText.includes("```json")) {
        responseText = responseText.split("```json")[1].split("```")[0].trim();
      }
      questions = JSON.parse(responseText);
    }

    return Array.isArray(questions) ? (questions as GeneratedQuestion[]) : [];
  } catch (error) {
    console.error("[NVIDIA EXTRACTION ERROR]", error);
    throw error;
  }
}

export async function generateMoreQuestionsFromText(
  text: string,
  anchorText: string,
  limit: number
): Promise<GeneratedQuestion[]> {
  try {
    const prompt = `You are a strict data extraction engine. Find this specific question in the text:
"${anchorText}"

Once found, start reading immediately AFTER it and EXTRACT THE NEXT ${limit} multiple-choice questions in verbatim JSON format.
EXPLANATIONS MUST BE "". 
Output ONLY a JSON object with a "questions" array.

Text:
` + text.slice(0, 40000);

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });

    let responseText = response.choices[0]?.message?.content?.trim() || "[]";
    let questions: unknown;
    try {
      const parsed = JSON.parse(responseText);
      questions = Array.isArray(parsed) ? parsed : (parsed.questions || parsed.data || []);
    } catch (e) {
      if (responseText.includes("```json")) {
        responseText = responseText.split("```json")[1].split("```")[0].trim();
      }
      questions = JSON.parse(responseText);
    }

    return Array.isArray(questions) ? (questions as GeneratedQuestion[]) : [];
  } catch (error) {
    console.error("[NVIDIA MORE EXTRACTION ERROR]", error);
    throw error;
  }
}
