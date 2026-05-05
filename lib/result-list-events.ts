import type { Prisma, PrismaClient } from "@prisma/client";

type EventDb = Pick<PrismaClient | Prisma.TransactionClient, "$executeRaw">;

export async function recordResultListEvent(
  db: EventDb,
  {
    quizId,
    resultId,
    action,
  }: {
    quizId?: string | null;
    resultId?: string | null;
    action: string;
  }
) {
  await db.$executeRaw`
    INSERT INTO "ResultListEvent" ("id", "quizId", "resultId", "action")
    VALUES (gen_random_uuid()::text, ${quizId ?? null}, ${resultId ?? null}, ${action})
  `;
}
