import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentQuizBlock } from "@/lib/quiz-guard-student";
import { sessionDeadline, finalizeExpiredOpenSession } from "@/lib/quiz-session";
import { recordResultListEvent } from "@/lib/result-list-events";

export const maxDuration = 60;

interface QuestionWithAnswer {
  id: string;
  questionText: string;
  options: unknown;
  correctAnswer: string;
  explanation: string | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: quizId } = await params;
    const body = await req.json();
    const { userAnswers, timeTaken } = body as {
      userAnswers: Record<string, string>;
      timeTaken?: number;
    };

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId, isPublished: true },
      include: { questions: { orderBy: { order: "asc" } } },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const open = await prisma.quizSession.findFirst({
      where: { quizId, studentId: session.user.id, submittedAt: null },
    });

    const block = await getStudentQuizBlock(req, quiz, session);
    // Explicitly allow submitting if blocked ONLY by 'ENDED' but they have an active session within grace period
    if (block && !(block.code === "ENDED" && open)) {
      const messages: Record<string, string> = {
        NOT_STARTED: "This quiz is not available yet.",
        ENDED: "This quiz has ended.",
        MAX_ATTEMPTS: "You have already completed this quiz.",
        PASSWORD_REQUIRED: "Quiz password required.",
      };
      return NextResponse.json(
        { error: messages[block.code] ?? "Cannot submit", code: block.code },
        { status: 403 }
      );
    }

    if (quiz.timeLimitMinutes || quiz.scheduledEnd) {
      if (!open) {
        return NextResponse.json(
          {
            error: "No active timed session. Open the quiz again to continue or start a new attempt.",
            code: "NO_SESSION",
          },
          { status: 403 }
        );
      }
      
      const deadline = sessionDeadline(open.startedAt, quiz.timeLimitMinutes, quiz.scheduledEnd);
      const graceMs = 120_000;
      if (deadline && Date.now() > deadline.getTime() + graceMs) {
        await finalizeExpiredOpenSession({
          quizId,
          studentId: session.user.id,
          timeLimitMinutes: quiz.timeLimitMinutes,
          scheduledEnd: quiz.scheduledEnd,
          totalQuestions: quiz.questions.length,
        });

        // Even if not finalized just now, if they were timed out they might already have a result from background check!
        const latResult = await prisma.result.findFirst({
          where: { quizId, studentId: session.user.id },
          orderBy: { createdAt: "desc" },
        });

        if (latResult) {
          return NextResponse.json({ resultId: latResult.id });
        }

        return NextResponse.json(
          {
            error: "The time limit for this attempt has passed and it was auto-graded. Go to your results.",
            code: "TIME_EXPIRED",
          },
          { status: 403 }
        );
      }
    }

    // remove internal keys and validate
    const finalAnswers: Record<string, string> = {};
    if (userAnswers && typeof userAnswers === 'object' && !Array.isArray(userAnswers)) {
      for (const k in userAnswers) {
        if (!k.startsWith('_')) {
          finalAnswers[k] = userAnswers[k];
        }
      }
    }

    // Server-side scoring
    let score = 0;
    const breakdown = (quiz.questions as unknown as QuestionWithAnswer[]).map((q) => {
      const selected = finalAnswers[q.id] ?? null;
      const isCorrect = selected === q.correctAnswer;
      if (isCorrect) score++;
      return {
        questionId: q.id,
        questionText: q.questionText,
        options: q.options,
        selected,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        isCorrect,
      };
    });

    const total = quiz.questions.length;

    const capSec = quiz.timeLimitMinutes ? quiz.timeLimitMinutes * 60 : undefined;
    const timeTakenCapped =
      capSec != null && timeTaken != null ? Math.min(timeTaken, capSec) : (timeTaken ?? null);

    const result = await prisma.$transaction(async (tx) => {
      const r = await tx.result.create({
        data: {
          quizId,
          studentId: session.user.id,
          score,
          total,
          timeTaken: timeTakenCapped,
          userAnswers: finalAnswers,
        },
      });
      await tx.quizSession.updateMany({
        where: { quizId, studentId: session.user.id, submittedAt: null },
        data: { submittedAt: new Date() },
      });
      await recordResultListEvent(tx, {
        quizId,
        resultId: r.id,
        action: "result.created",
      });
      return r;
    });

    return NextResponse.json({
      resultId: result.id,
      score,
      total,
      percentage: Math.round((score / total) * 100),
      timeTaken: result.timeTaken,
      quizTitle: quiz.title,
      breakdown,
    });
  } catch (error) {
    console.error("[SUBMIT ERROR]", error);
    return NextResponse.json({ error: "Failed to submit quiz" }, { status: 500 });
  }
}
