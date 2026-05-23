import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function quizIdFromPathname(pathname: string): string | undefined {
  const match = pathname.match(/\/api\/quiz\/([^/]+)\/share\/?$/);
  return match?.[1];
}

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolved = await context.params;
    const quizId = resolved?.id?.trim() || quizIdFromPathname(req.nextUrl.pathname) || "";
    if (!quizId) {
      return NextResponse.json({ error: "Missing quiz id" }, { status: 400 });
    }

    const quiz = await prisma.quiz.findFirst({
      where: { id: quizId, isPublished: true },
      select: { id: true, shareSlug: true },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    return NextResponse.json({
      sharePath: quiz.shareSlug ? `/quiz/${quiz.shareSlug}` : `/student/quizzes/${quiz.id}`,
    });
  } catch (error) {
    console.error("[GET QUIZ SHARE ERROR]", error);
    return NextResponse.json({ error: "Failed to load share link" }, { status: 500 });
  }
}
