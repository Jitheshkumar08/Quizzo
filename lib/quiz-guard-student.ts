import type { NextRequest } from "next/server";
import type { Session } from "next-auth";
import { prisma } from "@/lib/prisma";
import { quizAccessCookieName, verifyQuizAccessCookie } from "@/lib/quiz-access-cookie";

export type StudentQuizBlock =
  | { code: "NOT_STARTED"; scheduledStart: string }
  | { code: "ENDED"; scheduledEnd: string }
  | { code: "MAX_ATTEMPTS"; attemptsUsed: number }
  | { code: "PASSWORD_REQUIRED" };

type QuizGuardFields = {
  id: string;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  accessPasswordHash: string | null;
  allowMultipleAttempts: boolean;
};

export async function getStudentQuizBlock(
  req: NextRequest,
  quiz: QuizGuardFields,
  session: Session
): Promise<StudentQuizBlock | null> {
  const now = new Date();

  if (quiz.scheduledStart && quiz.scheduledEnd) {
    if (now < quiz.scheduledStart) {
      return { code: "NOT_STARTED", scheduledStart: quiz.scheduledStart.toISOString() };
    }
    if (now > quiz.scheduledEnd) {
      return { code: "ENDED", scheduledEnd: quiz.scheduledEnd.toISOString() };
    }
  }

  const attemptRows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*) AS "count"
    FROM "Result"
    WHERE "quizId" = ${quiz.id}
      AND "studentId" = ${session.user.id}
      AND COALESCE("attemptType", 'NORMAL') = 'NORMAL'
  `;
  const attemptsUsed = Number(attemptRows[0]?.count ?? 0);

  if (!quiz.allowMultipleAttempts && attemptsUsed >= 1) {
    return { code: "MAX_ATTEMPTS", attemptsUsed };
  }

  if (quiz.accessPasswordHash) {
    const cookie = req.cookies.get(quizAccessCookieName(quiz.id))?.value;
    if (!verifyQuizAccessCookie(cookie, quiz.id, session.user.id)) {
      return { code: "PASSWORD_REQUIRED" };
    }
  }

  return null;
}
