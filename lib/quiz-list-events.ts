import type { Prisma, PrismaClient } from "@prisma/client";

type EventDb = Pick<PrismaClient | Prisma.TransactionClient, "$executeRaw">;

export async function recordQuizListEvent(
  db: EventDb,
  {
    quizId,
    action,
    actorId,
  }: {
    quizId?: string | null;
    action: string;
    actorId?: string | null;
  }
) {
  await db.$executeRaw`
    INSERT INTO "QuizListEvent" ("id", "quizId", "action", "actorId")
    VALUES (gen_random_uuid()::text, ${quizId ?? null}, ${action}, ${actorId ?? null})
  `;
}
