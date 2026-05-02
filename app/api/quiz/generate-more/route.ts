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

    const { fullText, startIndex, endIndex } = await req.json();

    if (!fullText || !startIndex || !endIndex) {
      return NextResponse.json({ error: "Missing required parameters (fullText, startIndex, endIndex)" }, { status: 400 });
    }

    // Step 2: Generate specific range of questions from full context
    const questions = await generateQuestionsFromText(fullText, startIndex, endIndex);

    if (!questions.length) {
      return NextResponse.json({ error: "AI failed to generate more questions from this range" }, { status: 500 });
    }

    return NextResponse.json({ questions }, { status: 200 });
  } catch (error) {
    console.error("[GENERATE MORE ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
