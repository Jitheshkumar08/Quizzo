import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentQuizBlock } from "@/lib/quiz-guard-student";
import { ensureOpenQuizSession, finalizeExpiredOpenSession } from "@/lib/quiz-session";
import { recordQuizListEvent } from "@/lib/quiz-list-events";
import { canAccessQuizAnalytics, canManageQuizGlobally } from "@/lib/roles";

function quizIdFromPathname(pathname: string): string | undefined {
  const m = pathname.match(/\/api\/quiz\/([^/]+)\/?$/);
  return m?.[1];
}

// GET /api/quiz/[id] — fetch quiz questions for student (schedule, password cookie, attempts enforced)
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolved = await context.params;
    const quizId = resolved?.id?.trim() || quizIdFromPathname(req.nextUrl.pathname) || "";
    if (!quizId) {
      return NextResponse.json({ error: "Missing quiz id" }, { status: 400 });
    }

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
          },
        },
        createdBy: { select: { fullName: true } },
      },
    });

    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    if (quiz.timeLimitMinutes || quiz.scheduledEnd) {
      await finalizeExpiredOpenSession({
        quizId,
        studentId: session.user.id,
        timeLimitMinutes: quiz.timeLimitMinutes,
        scheduledEnd: quiz.scheduledEnd,
        totalQuestions: quiz.questions.length,
      });
    }

    const block = await getStudentQuizBlock(req, quiz, session);
    if (block) {
      const base = {
        title: quiz.title,
        code: block.code,
        error:
          block.code === "NOT_STARTED"
            ? "This quiz is not available yet."
            : block.code === "ENDED"
              ? "This quiz has ended."
              : block.code === "MAX_ATTEMPTS"
                ? "You have already completed this quiz."
                : "Quiz password required.",
        ...(block.code === "NOT_STARTED" ? { scheduledStart: block.scheduledStart } : {}),
        ...(block.code === "ENDED" ? { scheduledEnd: block.scheduledEnd } : {}),
        ...(block.code === "MAX_ATTEMPTS" ? { attemptsUsed: block.attemptsUsed } : {}),
      };
      return NextResponse.json(base, { status: 403 });
    }

    let timing: Awaited<ReturnType<typeof ensureOpenQuizSession>>;
    try {
      timing = await ensureOpenQuizSession({
        quizId,
        studentId: session.user.id,
        timeLimitMinutes: quiz.timeLimitMinutes,
        scheduledEnd: quiz.scheduledEnd,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        timing = await ensureOpenQuizSession({
          quizId,
          studentId: session.user.id,
          timeLimitMinutes: quiz.timeLimitMinutes,
          scheduledEnd: quiz.scheduledEnd,
        });
      } else {
        throw e;
      }
    }

    const safe = Object.fromEntries(
      Object.entries(quiz).filter(([key]) => key !== "accessPasswordHash")
    );
    return NextResponse.json({
      ...safe,
      sessionId: timing.sessionId,
      attemptDeadline: timing.attemptDeadline,
      serverNow: timing.serverNow,
      attemptStartedAt: timing.attemptStartedAt,
      savedAnswers: timing.savedAnswers,
    });
  } catch (error) {
    console.error("[GET QUIZ ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch quiz" }, { status: 500 });
  }
}

// PATCH /api/quiz/[id] — toggle published status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !canAccessQuizAnalytics(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: quizId } = await params;
    const body = await req.json();

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    if (quiz.createdById !== session.user.id && !canManageQuizGlobally(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const nextPublished = body.isPublished ?? !quiz.isPublished;
    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.quiz.update({
        where: { id: quizId },
        data: { isPublished: nextPublished },
      });

      if (nextPublished !== quiz.isPublished) {
        await tx.quizSession.updateMany({
          where: { quizId, submittedAt: null },
          data: { submittedAt: new Date() },
        });

        await recordQuizListEvent(tx, {
          quizId,
          action: nextPublished ? "quiz.published" : "quiz.unpublished",
          actorId: session.user.id,
        });
      }

      return next;
    });

    return NextResponse.json({ isPublished: updated.isPublished });
  } catch (error) {
    console.error("[PATCH QUIZ ERROR]", error);
    return NextResponse.json({ error: "Failed to update quiz" }, { status: 500 });
  }
}

// DELETE /api/quiz/[id] — delete quiz and all its questions/results
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role === "MOD") {
      return NextResponse.json({ error: "Moderators cannot delete quizzes" }, { status: 403 });
    }
    if (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: quizId } = await params;

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    if (quiz.createdById !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.quiz.delete({ where: { id: quizId } });
      await recordQuizListEvent(tx, {
        quizId,
        action: "quiz.deleted",
        actorId: session.user.id,
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE QUIZ ERROR]", error);
    return NextResponse.json({ error: "Failed to delete quiz" }, { status: 500 });
  }
}
