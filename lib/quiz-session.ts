import { prisma } from "@/lib/prisma";

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

export function computeEffectiveStart(startedAt: Date, currentAnswers: any): Date {
  if (!currentAnswers || typeof currentAnswers !== 'object' || Array.isArray(currentAnswers) || !currentAnswers._lastSync) return startedAt;
  
  const lastSyncDate = new Date(currentAnswers._lastSync);
  const now = new Date();
  
  // If lastSync was in the past, they were offline for the duration since lastSync.
  // We push startedAt forward by that duration to effectively pause the timer.
  // Use a 30 second threshold so normal heartbeat intervals (every 15s) aren't counted as pauses.
  if (lastSyncDate < now) {
    const offlineMs = now.getTime() - lastSyncDate.getTime();
    if (offlineMs > 30000) {
      return new Date(startedAt.getTime() + offlineMs);
    }
  }
  return startedAt;
}

/** If an open session is past its deadline, record a zero-score result and close the session. */
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

  const effectiveStartedAt = computeEffectiveStart(open.startedAt, open.currentAnswers);
  const deadline = sessionDeadline(effectiveStartedAt, args.timeLimitMinutes, args.scheduledEnd);
  if (!deadline) return false;

  if (new Date() <= deadline) return false;

  // It's expired
  let elapsedSec = Math.max(0, Math.floor((new Date().getTime() - effectiveStartedAt.getTime()) / 1000));
  if (args.timeLimitMinutes) {
    elapsedSec = Math.min(args.timeLimitMinutes * 60, elapsedSec);
  }

  // Calculate score based on current answers
  let score = 0;
  const rawAnswers = (open.currentAnswers as Record<string, any>) || {};
  
  // Clone to remove internal fields
  const userAnswers: Record<string, string> = {};
  if (typeof rawAnswers === 'object' && !Array.isArray(rawAnswers)) {
    for (const k in rawAnswers) {
      if (!k.startsWith('_')) {
        userAnswers[k] = rawAnswers[k];
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

  await prisma.$transaction([
    prisma.result.create({
      data: {
        quizId: args.quizId,
        studentId: args.studentId,
        score: score,
        total: args.totalQuestions,
        timeTaken: elapsedSec,
        userAnswers: userAnswers,
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
  scheduledEnd: Date | null;
}): Promise<{
  attemptDeadline: string | null;
  serverNow: string;
  attemptStartedAt: string | null;
}> {
  const serverNow = new Date();

  // Find an existing open session
  let open = await prisma.quizSession.findFirst({
    where: { quizId: args.quizId, studentId: args.studentId, submittedAt: null },
  });

  // If no open session exists, create one (this establishes the attempt start time)
  if (!open) {
    const initialAnswers = { _lastSync: serverNow.toISOString() };
    open = await prisma.quizSession.create({
      data: { 
        quizId: args.quizId, 
        studentId: args.studentId,
        currentAnswers: initialAnswers 
      },
    });
  } else {
    // If it exists, check how long they've been offline and pause the timer accordingly
    const effectiveStart = computeEffectiveStart(open.startedAt, open.currentAnswers);
    
    // Always update the DB with the new startedAt and a fresh _lastSync
    let baseAnswers = {};
    if (open.currentAnswers && typeof open.currentAnswers === 'object' && !Array.isArray(open.currentAnswers)) {
      baseAnswers = open.currentAnswers;
    }
    const updatedAnswers = { ...baseAnswers, _lastSync: serverNow.toISOString() };
    
    open = await prisma.quizSession.update({
      where: { id: open.id },
      data: { 
        startedAt: effectiveStart,
        currentAnswers: updatedAnswers
      }
    });
  }

  const deadline = sessionDeadline(open.startedAt, args.timeLimitMinutes, args.scheduledEnd);
  return {
    attemptDeadline: deadline ? deadline.toISOString() : null,
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
