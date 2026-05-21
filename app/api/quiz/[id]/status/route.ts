import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentQuizBlock } from "@/lib/quiz-guard-student";

const messages: Record<string, string> = {
  QUIZ_UNAVAILABLE: "This quiz is no longer available. You will be taken back to Browse Quizzes.",
  QUIZ_UPDATED: "This quiz was changed while you were taking it. You will be taken back to Browse Quizzes.",
  NOT_STARTED: "This quiz is not available yet. You will be taken back to Browse Quizzes.",
  ENDED: "This quiz has ended. You will be taken back to Browse Quizzes.",
  MAX_ATTEMPTS: "This attempt is no longer available. You will be taken back to Browse Quizzes.",
  PASSWORD_REQUIRED: "Quiz access changed. You will be taken back to Browse Quizzes.",
  NO_SESSION: "This attempt is no longer active. You will be taken back to Browse Quizzes.",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id: quizId } = await params;
    const sessionId = req.nextUrl.searchParams.get("sessionId")?.trim();
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        isPublished: true,
        isClosed: true,
        scheduledStart: true,
        scheduledEnd: true,
        accessPasswordHash: true,
        allowMultipleAttempts: true,
        updatedAt: true,
      },
    });

    if (!quiz || !quiz.isPublished) {
      return NextResponse.json(
        { ok: false, code: "QUIZ_UNAVAILABLE", message: messages.QUIZ_UNAVAILABLE },
        { status: 409 }
      );
    }

    const attemptSession = sessionId
      ? await prisma.quizSession.findFirst({
          where: { id: sessionId, quizId, studentId: session.user.id },
          select: { startedAt: true, submittedAt: true },
        })
      : await prisma.quizSession.findFirst({
          where: { quizId, studentId: session.user.id, submittedAt: null },
          select: { startedAt: true, submittedAt: true },
        });

    if (!attemptSession) {
      return NextResponse.json(
        { ok: false, code: "NO_SESSION", message: messages.NO_SESSION },
        { status: 409 }
      );
    }

    if (quiz.updatedAt.getTime() > attemptSession.startedAt.getTime() + 3000) {
      return NextResponse.json(
        { ok: false, code: "QUIZ_UPDATED", message: messages.QUIZ_UPDATED },
        { status: 409 }
      );
    }

    if (attemptSession.submittedAt) {
      return NextResponse.json(
        { ok: false, code: "NO_SESSION", message: messages.NO_SESSION },
        { status: 409 }
      );
    }

    const block = await getStudentQuizBlock(req, quiz, session);
    if (block) {
      return NextResponse.json(
        { ok: false, code: block.code, message: messages[block.code] },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: true, serverNow: new Date().toISOString() });
  } catch (error) {
    console.error("[QUIZ STATUS ERROR]", error);
    return NextResponse.json({ error: "Failed to check quiz status" }, { status: 500 });
  }
}
