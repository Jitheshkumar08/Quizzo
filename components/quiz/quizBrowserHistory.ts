"use client";

const SUBMITTED_QUIZ_KEY_PREFIX = "quizzo.submittedQuiz.";
const START_INTENT_KEY_PREFIX = "quizzo.startQuizIntent.";
const START_INTENT_TTL_MS = 30_000;

function getSessionStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function submittedQuizKey(quizId: string) {
  return `${SUBMITTED_QUIZ_KEY_PREFIX}${quizId}`;
}

function startIntentKey(quizId: string) {
  return `${START_INTENT_KEY_PREFIX}${quizId}`;
}

export function markQuizSubmittedForHistory(quizId: string) {
  getSessionStorage()?.setItem(submittedQuizKey(quizId), "1");
}

export function markQuizStartIntent(quizId: string) {
  getSessionStorage()?.setItem(startIntentKey(quizId), String(Date.now()));
}

function consumeQuizStartIntent(quizId: string) {
  const storage = getSessionStorage();
  const key = startIntentKey(quizId);
  const value = storage?.getItem(key);
  storage?.removeItem(key);

  if (!value) return false;

  const createdAt = Number(value);
  return Number.isFinite(createdAt) && Date.now() - createdAt <= START_INTENT_TTL_MS;
}

export function shouldRedirectSubmittedQuizHistoryOpen(quizId: string) {
  const storage = getSessionStorage();
  if (!storage) return false;

  if (consumeQuizStartIntent(quizId)) {
    storage.removeItem(submittedQuizKey(quizId));
    return false;
  }

  return storage.getItem(submittedQuizKey(quizId)) === "1";
}
