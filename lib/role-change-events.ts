import type { Prisma, PrismaClient } from "@prisma/client";

type EventDb = Pick<PrismaClient | Prisma.TransactionClient, "$executeRaw">;

export async function recordUserChangeEvent(
  db: EventDb,
  {
    targetUserId,
    actorId,
    action,
  }: {
    targetUserId: string;
    actorId?: string | null;
    action: string;
  }
) {
  await db.$executeRaw`
    INSERT INTO "RoleChangeEvent" ("id", "targetUserId", "actorId", "action")
    VALUES (gen_random_uuid()::text, ${targetUserId}, ${actorId ?? null}, ${action})
  `;
}
