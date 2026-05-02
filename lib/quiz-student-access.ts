import type { Quiz } from "@prisma/client";

export type ScheduleStatus = "none" | "upcoming" | "open" | "ended";

export function getScheduleStatus(
  now: Date,
  start: Date | null,
  end: Date | null
): ScheduleStatus {
  if (!start || !end) return "none";
  if (now < start) return "upcoming";
  if (now > end) return "ended";
  return "open";
}

export function quizHasSchedule(quiz: Pick<Quiz, "scheduledStart" | "scheduledEnd">) {
  return !!(quiz.scheduledStart && quiz.scheduledEnd);
}
