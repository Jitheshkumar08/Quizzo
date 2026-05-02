import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parsePdfBuffer } from "@/lib/pdfParser";
import { generateQuestionsFromText } from "@/lib/gemini";
import { uploadJsonToBlob } from "@/lib/blobStorage";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN")) {
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

    // Step 3: Chunk text to prevent 503 errors and token limits
    const CHUNK_SIZE = 12000;
    const initialText = text.slice(0, CHUNK_SIZE);
    const remainingText = text.length > CHUNK_SIZE ? text.slice(CHUNK_SIZE) : "";

    // Generate questions with Gemini for the first chunk
    const questions = await generateQuestionsFromText(initialText);

    if (!questions.length) {
      return NextResponse.json({ error: "AI failed to generate questions" }, { status: 500 });
    }

    // Step 4: Upload JSON to Vercel Blob (Initial batch)
    const jsonBlobUrl = await uploadJsonToBlob(title, questions);

    return NextResponse.json({ questions, jsonBlobUrl, remainingText }, { status: 200 });
  } catch (error) {
    console.error("[GENERATE ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Generation failed" },
      { status: 500 }
    );
  }
}
