import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateMoreQuestionsFromText } from "@/lib/gemini";
import { canAccessInstructorArea } from "@/lib/roles";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !canAccessInstructorArea(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fullText, lastQuestionText, limit } = await req.json();

    if (!fullText || !lastQuestionText) {
      return NextResponse.json({ error: "Missing required parameters (fullText, lastQuestionText)" }, { status: 400 });
    }

    // Step 2: Generate specific range of questions from full context using the Anchor
    const fetchLimit = limit || 25;
    const questions = await generateMoreQuestionsFromText(fullText, lastQuestionText, fetchLimit);

    if (!questions.length) {
      return NextResponse.json({ error: "AI failed to generate more questions using the anchor text" }, { status: 500 });
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
