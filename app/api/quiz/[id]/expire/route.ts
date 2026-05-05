import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { finalizeExpiredOpenSession } from "@/lib/quiz-session";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: quizId } = await params;
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId, isPublished: true },
      select: {
        id: true,
        timeLimitMinutes: true,
        scheduledEnd: true,
        _count: { select: { questions: true } },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const expired = await finalizeExpiredOpenSession({
      quizId,
      studentId: session.user.id,
      timeLimitMinutes: quiz.timeLimitMinutes,
      scheduledEnd: quiz.scheduledEnd,
      totalQuestions: quiz._count.questions,
    });

    const result = expired
      ? await prisma.result.findFirst({
          where: { quizId, studentId: session.user.id },
          orderBy: { createdAt: "desc" },
          select: { id: true },
        })
      : null;

    return NextResponse.json({ expired, resultId: result?.id ?? null });
  } catch (error) {
    console.error("[EXPIRE QUIZ ERROR]", error);
    return NextResponse.json({ error: "Failed to finalize expired quiz" }, { status: 500 });
  }
}
