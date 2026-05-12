import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordQuizListEvent } from "@/lib/quiz-list-events";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body.ids)
      ? body.ids.filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0)
      : [];

    if (ids.length === 0 || new Set(ids).size !== ids.length) {
      return NextResponse.json({ error: "A complete unique quiz order is required" }, { status: 400 });
    }

    const published = await prisma.quiz.findMany({
      where: { isPublished: true },
      select: { id: true },
    });
    const publishedIds = new Set(published.map((quiz) => quiz.id));

    if (ids.length !== publishedIds.size || ids.some((id) => !publishedIds.has(id))) {
      return NextResponse.json(
        { error: "Refresh and reorder the full default quiz list before saving" },
        { status: 409 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await Promise.all(
        ids.map((id, index) =>
          tx.quiz.update({
            where: { id },
            data: { displayOrder: index },
          })
        )
      );

      await recordQuizListEvent(tx, {
        quizId: null,
        action: "quiz.order.updated",
        actorId: session.user.id,
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[QUIZ ORDER ERROR]", error);
    return NextResponse.json({ error: "Failed to save quiz order" }, { status: 500 });
  }
}
