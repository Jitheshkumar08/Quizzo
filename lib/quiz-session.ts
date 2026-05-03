import { prisma } from "@/lib/prisma";

export function sessionDeadline(startedAt: Date, timeLimitMinutes: number): Date {
  return new Date(startedAt.getTime() + timeLimitMinutes * 60 * 1000);
}

/** If an open session is past its deadline, record a zero-score result and close the session. */
export async function finalizeExpiredOpenSession(args: {
  quizId: string;
  studentId: string;
  timeLimitMinutes: number | null;
  totalQuestions: number;
}): Promise<boolean> {
  if (!args.timeLimitMinutes) return false;

  const open = await prisma.quizSession.findFirst({
    where: { quizId: args.quizId, studentId: args.studentId, submittedAt: null },
  });
  if (!open) return false;

  const deadline = sessionDeadline(open.startedAt, args.timeLimitMinutes);
  if (new Date() <= deadline) return false;

  const elapsedSec = Math.min(
    args.timeLimitMinutes * 60,
    Math.max(0, Math.floor((deadline.getTime() - open.startedAt.getTime()) / 1000))
  );

  await prisma.$transaction([
    prisma.result.create({
      data: {
        quizId: args.quizId,
        studentId: args.studentId,
        score: 0,
        total: args.totalQuestions,
        timeTaken: elapsedSec,
        userAnswers: {},
      },
    }),
    prisma.quizSession.update({
      where: { id: open.id },
      data: { submittedAt: new Date() },
    }),
  ]);

  return true;
}

export async function ensureOpenQuizSession(args: {
  quizId: string;
  studentId: string;
  timeLimitMinutes: number | null;
}): Promise<{
  attemptDeadline: string | null;
  serverNow: string;
  attemptStartedAt: string | null;
}> {
  const serverNow = new Date();
  if (!args.timeLimitMinutes) {
    return { attemptDeadline: null, serverNow: serverNow.toISOString(), attemptStartedAt: null };
  }

  let open = await prisma.quizSession.findFirst({
    where: { quizId: args.quizId, studentId: args.studentId, submittedAt: null },
  });

  if (!open) {
    open = await prisma.quizSession.create({
      data: { quizId: args.quizId, studentId: args.studentId },
    });
  }

  const deadline = sessionDeadline(open.startedAt, args.timeLimitMinutes);
  return {
    attemptDeadline: deadline.toISOString(),
    serverNow: serverNow.toISOString(),
    attemptStartedAt: open.startedAt.toISOString(),
  };
}

export async function closeOpenQuizSessions(quizId: string, studentId: string) {
  await prisma.quizSession.updateMany({
    where: { quizId, studentId, submittedAt: null },
    data: { submittedAt: new Date() },
  });
}
