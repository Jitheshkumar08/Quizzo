import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/quiz/[id] — fetch quiz questions for student
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: quizId } = await params;

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId, isPublished: true },
      include: {
        questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            questionText: true,
            options: true,
            order: true,
            // DO NOT include correctAnswer here — students shouldn't see it before submit
          },
        },
        createdBy: { select: { fullName: true } },
      },
    });

    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    return NextResponse.json(quiz);
  } catch (error) {
    console.error("[GET QUIZ ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch quiz" }, { status: 500 });
  }
}
