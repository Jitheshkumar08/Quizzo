import type { Prisma } from "@prisma/client";

const MAX_SLUG_BASE_LENGTH = 54;

export function slugifyQuizTitle(title: string) {
  return (
    title
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, MAX_SLUG_BASE_LENGTH)
      .replace(/-+$/g, "") || "quiz"
  );
}

export async function generateUniqueQuizShareSlug(
  tx: Prisma.TransactionClient,
  title: string,
  excludeQuizId?: string
) {
  const base = slugifyQuizTitle(title);

  for (let suffix = 0; suffix < 100; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    const existing = await tx.quiz.findUnique({
      where: { shareSlug: candidate },
      select: { id: true },
    });

    if (!existing || existing.id === excludeQuizId) {
      return candidate;
    }
  }

  return `${base}-${Date.now().toString(36)}`;
}
