import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/roles";
import { slugifyQuizTitle } from "@/lib/quiz-share-slug";
import { recordQuizListEvent } from "@/lib/quiz-list-events";

function quizIdFromPathname(pathname: string): string | undefined {
  const match = pathname.match(/\/api\/admin\/slugs\/([^/]+)\/?$/);
  return match?.[1];
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ quizId: string }> }) {
  try {
    const session = await auth();
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolved = await context.params;
    const quizId = resolved?.quizId?.trim() || quizIdFromPathname(req.nextUrl.pathname) || "";
    if (!quizId) {
      return NextResponse.json({ error: "Missing quiz id" }, { status: 400 });
    }

    const body: unknown = await req.json();
    if (typeof body !== "object" || body === null || !("slug" in body) || typeof body.slug !== "string") {
      return NextResponse.json({ error: "Enter a valid slug" }, { status: 400 });
    }

    const nextSlug = slugifyQuizTitle(body.slug);

    const result = await prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.findUnique({
        where: { id: quizId },
        select: { id: true, shareSlug: true },
      });

      if (!quiz) {
        return { status: 404 as const, body: { error: "Quiz not found" } };
      }

      const existingQuiz = await tx.quiz.findUnique({
        where: { shareSlug: nextSlug },
        select: { id: true },
      });
      if (existingQuiz && existingQuiz.id !== quiz.id) {
        return { status: 409 as const, body: { error: "That slug is already used by another quiz" } };
      }

      const existingAlias = await tx.quizShareAlias.findUnique({
        where: { slug: nextSlug },
        select: { quizId: true },
      });
      if (existingAlias && existingAlias.quizId !== quiz.id) {
        return { status: 409 as const, body: { error: "That slug is already used as an old share link" } };
      }

      if (quiz.shareSlug && quiz.shareSlug !== nextSlug) {
        await tx.quizShareAlias.upsert({
          where: { slug: quiz.shareSlug },
          update: { quizId: quiz.id },
          create: { quizId: quiz.id, slug: quiz.shareSlug },
        });
      }

      const updated = await tx.quiz.update({
        where: { id: quiz.id },
        data: { shareSlug: nextSlug },
        select: {
          id: true,
          shareSlug: true,
          shareAliases: {
            orderBy: { createdAt: "desc" },
            select: { id: true, slug: true, createdAt: true },
          },
        },
      });

      await tx.quizShareAlias.deleteMany({
        where: { quizId: quiz.id, slug: nextSlug },
      });

      await recordQuizListEvent(tx, {
        quizId: quiz.id,
        action: "SHARE_SLUG_UPDATED",
        actorId: session.user.id,
      });

      return {
        status: 200 as const,
        body: {
          id: updated.id,
          shareSlug: updated.shareSlug,
          aliases: updated.shareAliases
            .filter((alias) => alias.slug !== nextSlug)
            .map((alias) => ({
              id: alias.id,
              slug: alias.slug,
              createdAt: alias.createdAt.toISOString(),
            })),
        },
      };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("[PATCH ADMIN SLUG ERROR]", error);
    return NextResponse.json({ error: "Failed to update slug" }, { status: 500 });
  }
}
