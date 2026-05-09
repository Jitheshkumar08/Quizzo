import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parsePdfBuffer } from "@/lib/pdfParser";
import { generateQuestionsFromText, getTotalQuestionsCount } from "@/lib/gemini";
import { uploadJsonToBlob } from "@/lib/blobStorage";
import { canAccessInstructorArea } from "@/lib/roles";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !canAccessInstructorArea(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("pdf") as File | null;
    const title = formData.get("title") as string | null;

    if (!file || !title) {
      return NextResponse.json({ error: "PDF file and title are required" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
    }

    // Step 1: Read file as Buffer (never write to disk)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Step 2: Extract text
    const text = await parsePdfBuffer(buffer);

    if (!text || text.trim().length < 100) {
      return NextResponse.json(
        { error: "Could not extract enough text from the PDF. Make sure it's not scanned/image-only." },
        { status: 422 }
      );
    }

    // Step 3: Count total questions first
    const totalQuestions = await getTotalQuestionsCount(text);

    // Generate first 25 questions
    const endRange = Math.min(25, totalQuestions || 25);
    const questions = await generateQuestionsFromText(text, 1, endRange);

    if (!questions.length) {
      return NextResponse.json({ error: "AI failed to generate questions" }, { status: 500 });
    }

    // Step 4: Upload JSON to Vercel Blob (Initial batch)
    const jsonBlobUrl = await uploadJsonToBlob(title, questions);

    return NextResponse.json({ questions, jsonBlobUrl, fullText: text, totalQuestions }, { status: 200 });
  } catch (error) {
    console.error("[GENERATE ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
