import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const MISSING_COLUMN_RETRY_MS = 5 * 60 * 1000;
let skipPresenceUntil = 0;

function isMissingLastSeenColumnError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;

  return (
    error.code === "P2022" ||
    (error.code === "P2010" &&
      typeof error.meta?.code === "string" &&
      error.meta.code === "42703")
  );
}

function shouldSkipPresence() {
  return Date.now() < skipPresenceUntil;
}

function markMissingColumn() {
  skipPresenceUntil = Date.now() + MISSING_COLUMN_RETRY_MS;
}

export function isPresenceTemporarilyDisabled() {
  return shouldSkipPresence();
}

export async function touchUserPresence(userId: string) {
  if (shouldSkipPresence()) return false;

  try {
    await prisma.$executeRaw`
      UPDATE "User"
      SET "lastSeenAt" = NOW()
      WHERE "id" = ${userId}
        AND ("lastSeenAt" IS NULL OR "lastSeenAt" < NOW() - INTERVAL '45 seconds')
    `;
    return true;
  } catch (error) {
    if (isMissingLastSeenColumnError(error)) {
      markMissingColumn();
    } else {
      console.error("[PRESENCE TOUCH ERROR]", error);
    }
    return false;
  }
}

export async function getLastSeenByUserIds(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, Date | null>();
  if (shouldSkipPresence()) return new Map<string, Date | null>();

  try {
    const rows = await prisma.$queryRaw<Array<{ id: string; lastSeenAt: Date | null }>>(
      Prisma.sql`
        SELECT "id", "lastSeenAt"
        FROM "User"
        WHERE "id" IN (${Prisma.join(userIds)})
      `
    );

    return new Map(rows.map((row) => [row.id, row.lastSeenAt]));
  } catch (error) {
    if (isMissingLastSeenColumnError(error)) {
      markMissingColumn();
    } else {
      console.error("[PRESENCE READ ERROR]", error);
    }
    return new Map<string, Date | null>();
  }
}

export async function getActiveUserIds() {
  if (shouldSkipPresence()) return [];

  try {
    const rows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "User"
      WHERE "lastSeenAt" >= NOW() - INTERVAL '2 minutes'
    `;

    return rows.map((row) => row.id);
  } catch (error) {
    if (isMissingLastSeenColumnError(error)) {
      markMissingColumn();
    } else {
      console.error("[PRESENCE ACTIVE USERS ERROR]", error);
    }
    return [];
  }
}
