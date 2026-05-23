import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/roles";
import { recordQuizListEvent } from "@/lib/quiz-list-events";

function aliasIdFromPathname(pathname: string): string | undefined {
  const match = pathname.match(/\/api\/admin\/slugs\/aliases\/([^/]+)\/?$/);
  return match?.[1];
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ aliasId: string }> }) {
  try {
    const session = await auth();
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolved = await context.params;
    const aliasId = resolved?.aliasId?.trim() || aliasIdFromPathname(req.nextUrl.pathname) || "";
    if (!aliasId) {
      return NextResponse.json({ error: "Missing alias id" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const alias = await tx.quizShareAlias.findUnique({
        where: { id: aliasId },
        select: { id: true, quizId: true },
      });

      if (!alias) {
        return { status: 404 as const, body: { error: "Alias not found" } };
      }

      await tx.quizShareAlias.delete({ where: { id: alias.id } });
      await recordQuizListEvent(tx, {
        quizId: alias.quizId,
        action: "SHARE_ALIAS_DELETED",
        actorId: session.user.id,
      });

      return { status: 200 as const, body: { id: alias.id, quizId: alias.quizId } };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("[DELETE ADMIN SLUG ALIAS ERROR]", error);
    return NextResponse.json({ error: "Failed to delete alias" }, { status: 500 });
  }
}
