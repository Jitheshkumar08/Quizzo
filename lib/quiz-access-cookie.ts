import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_PREFIX = "quizzo_qa_";

export function quizAccessCookieName(quizId: string) {
  return `${COOKIE_PREFIX}${quizId}`;
}

function secret() {
  return process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "dev-quiz-access-secret";
}

export function signQuizAccess(quizId: string, studentId: string) {
  return createHmac("sha256", secret()).update(`quiz:${quizId}:student:${studentId}`).digest("base64url");
}

export function verifyQuizAccessCookie(
  cookieValue: string | undefined,
  quizId: string,
  studentId: string
) {
  if (!cookieValue) return false;
  try {
    const expected = signQuizAccess(quizId, studentId);
    const a = Buffer.from(cookieValue);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
