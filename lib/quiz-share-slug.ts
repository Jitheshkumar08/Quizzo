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
    const existingAlias = await tx.quizShareAlias.findUnique({
      where: { slug: candidate },
      select: { quizId: true },
    });

    const quizMatches = !existing || existing.id === excludeQuizId;
    const aliasMatches = !existingAlias || existingAlias.quizId === excludeQuizId;

    if (quizMatches && aliasMatches) {
      return candidate;
    }
  }

  return `${base}-${Date.now().toString(36)}`;
}

export async function buildQuizShareSlugUpdate(
  tx: Prisma.TransactionClient,
  {
    quizId,
    currentSlug,
    title,
  }: {
    quizId: string;
    currentSlug: string | null;
    title: string;
  }
) {
  const nextSlug = await generateUniqueQuizShareSlug(tx, title, quizId);
  if (nextSlug === currentSlug) {
    return { shareSlug: currentSlug };
  }

  if (currentSlug) {
    await tx.quizShareAlias.upsert({
      where: { slug: currentSlug },
      update: { quizId },
      create: { quizId, slug: currentSlug },
    });
  }

  return { shareSlug: nextSlug };
}
