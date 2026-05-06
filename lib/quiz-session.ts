import { prisma } from "@/lib/prisma";
import { recordResultListEvent } from "@/lib/result-list-events";

export function sessionDeadline(startedAt: Date, timeLimitMinutes: number | null, scheduledEnd: Date | null): Date | null {
  let deadline: Date | null = null;
  if (timeLimitMinutes) {
    deadline = new Date(startedAt.getTime() + timeLimitMinutes * 60 * 1000);
  }
  if (scheduledEnd) {
    if (!deadline || scheduledEnd < deadline) {
      deadline = scheduledEnd;
    }
  }
  return deadline;
}

/** If an open session is past its deadline, grade saved answers and close the session. */
export async function finalizeExpiredOpenSession(args: {
  quizId: string;
  studentId: string;
  timeLimitMinutes: number | null;
  scheduledEnd: Date | null;
  totalQuestions: number;
}): Promise<boolean> {
  const open = await prisma.quizSession.findFirst({
    where: { quizId: args.quizId, studentId: args.studentId, submittedAt: null },
  });
  if (!open) return false;

  const deadline = sessionDeadline(open.startedAt, args.timeLimitMinutes, args.scheduledEnd);
  if (!deadline) return false;

  if (new Date() <= deadline) return false;

  // It's expired
  let elapsedSec = Math.max(0, Math.floor((new Date().getTime() - open.startedAt.getTime()) / 1000));
  if (args.timeLimitMinutes) {
    elapsedSec = Math.min(args.timeLimitMinutes * 60, elapsedSec);
  }

  // Calculate score based on current answers
  let score = 0;
  const rawAnswers = (open.currentAnswers as Record<string, unknown>) || {};
  
  // Clone to remove internal fields
  const userAnswers: Record<string, string> = {};
  if (typeof rawAnswers === 'object' && !Array.isArray(rawAnswers)) {
    for (const k in rawAnswers) {
      if (!k.startsWith('_')) {
        if (typeof rawAnswers[k] === "string") {
          userAnswers[k] = rawAnswers[k];
        }
      }
    }
  }

  if (open.currentAnswers) {
    const quiz = await prisma.quiz.findUnique({
      where: { id: args.quizId },
      include: { questions: true }
    });

    if (quiz) {
      for (const q of quiz.questions) {
        if (userAnswers[q.id] === q.correctAnswer) {
          score++;
        }
      }
    }
  }

  return prisma.$transaction(async (tx) => {
    const closed = await tx.quizSession.updateMany({
      where: { id: open.id, submittedAt: null },
      data: { submittedAt: new Date() },
    });

    if (closed.count === 0) return false;

    const result = await tx.result.create({
      data: {
        quizId: args.quizId,
        studentId: args.studentId,
        score,
        total: args.totalQuestions,
        timeTaken: elapsedSec,
        userAnswers,
      },
    });

    await recordResultListEvent(tx, {
      quizId: args.quizId,
      resultId: result.id,
      action: "result.auto_created",
    });

    return true;
  });
}

export async function ensureOpenQuizSession(args: {
  quizId: string;
  studentId: string;
  timeLimitMinutes: number | null;
  scheduledEnd: Date | null;
}): Promise<{
  sessionId: string;
  attemptDeadline: string | null;
  serverNow: string;
  attemptStartedAt: string | null;
  savedAnswers: Record<string, string>;
}> {
  const serverNow = new Date();

  // Find an existing open session
  let open = await prisma.quizSession.findFirst({
    where: { quizId: args.quizId, studentId: args.studentId, submittedAt: null },
  });

  // If no open session exists, create one (this establishes the attempt start time)
  if (!open) {
    open = await prisma.quizSession.create({
      data: { 
        quizId: args.quizId, 
        studentId: args.studentId,
        currentAnswers: {},
      },
    });
  }

  const deadline = sessionDeadline(open.startedAt, args.timeLimitMinutes, args.scheduledEnd);
  return {
    sessionId: open.id,
    attemptDeadline: deadline ? deadline.toISOString() : null,
    serverNow: serverNow.toISOString(),
    attemptStartedAt: open.startedAt.toISOString(),
    savedAnswers: (open.currentAnswers as Record<string, string>) || {},
  };
}

export async function closeOpenQuizSessions(quizId: string, studentId: string) {
  await prisma.quizSession.updateMany({
    where: { quizId, studentId, submittedAt: null },
    data: { submittedAt: new Date() },
  });
}
