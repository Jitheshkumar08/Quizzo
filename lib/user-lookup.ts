import { prisma } from "@/lib/prisma";

export function normalizeIdentifier(identifier: string) {
  return identifier.trim().toLowerCase();
}

export async function findUserByIdentifier(identifier: string) {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) return null;

  if (normalized.includes("@")) {
    return prisma.user.findUnique({ where: { email: normalized } });
  }

  return prisma.user.findUnique({ where: { username: normalized } });
}
