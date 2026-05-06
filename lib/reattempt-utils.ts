export const MISSED_REATTEMPT_LABEL = "Missed Reattempt";
export const MISSED_REATTEMPT_TYPE = "MISSED_REATTEMPT";

export function parseStringArray(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    const ids = value.filter((item): item is string => typeof item === "string" && item.length > 0);
    return ids.length > 0 ? ids : null;
  }

  if (typeof value === "string" && value.trim()) {
    try {
      return parseStringArray(JSON.parse(value));
    } catch {
      return null;
    }
  }

  return null;
}

export function parseAnswerMap(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const answers: Record<string, string> = {};
  for (const [key, answer] of Object.entries(value)) {
    if (typeof key === "string" && typeof answer === "string" && !key.startsWith("_")) {
      answers[key] = answer;
    }
  }
  return answers;
}

export function cleanAnswerMap(value: unknown, allowedQuestionIds?: Set<string>): Record<string, string> {
  const answers = parseAnswerMap(value);
  if (!allowedQuestionIds) return answers;

  const filtered: Record<string, string> = {};
  for (const [questionId, answer] of Object.entries(answers)) {
    if (allowedQuestionIds.has(questionId)) filtered[questionId] = answer;
  }
  return filtered;
}

export function reattemptResultTitle(quizTitle: string) {
  return `${quizTitle} - ${MISSED_REATTEMPT_LABEL}`;
}
