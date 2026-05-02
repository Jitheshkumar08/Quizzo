import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateQuestionsFromText } from "@/lib/gemini";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { remainingText } = await req.json();

    if (!remainingText) {
      return NextResponse.json({ error: "No remaining text provided" }, { status: 400 });
    }

    // Step 1: Slice the next chunk
    const CHUNK_SIZE = 12000;
    const initialText = remainingText.slice(0, CHUNK_SIZE);
    const newRemainingText = remainingText.length > CHUNK_SIZE ? remainingText.slice(CHUNK_SIZE) : "";

    // Step 2: Generate questions
    const questions = await generateQuestionsFromText(initialText);

    if (!questions.length) {
      return NextResponse.json({ error: "AI failed to generate more questions from this chunk" }, { status: 500 });
    }

    return NextResponse.json({ questions, remainingText: newRemainingText }, { status: 200 });
  } catch (error) {
    console.error("[GENERATE MORE ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
