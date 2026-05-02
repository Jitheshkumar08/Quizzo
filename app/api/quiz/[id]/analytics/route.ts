import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function quizIdFromPathname(pathname: string): string | undefined {
  const m = pathname.match(/\/api\/quiz\/([^/]+)\/analytics\/?$/);
  return m?.[1];
}

// GET /api/quiz/[id]/analytics — instructor fetches all attempt results for a quiz
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolved = await context.params;
    const quizId =
      resolved?.id?.trim() || quizIdFromPathname(req.nextUrl.pathname) || "";

    if (!quizId) {
      return NextResponse.json({ error: "Missing quiz id" }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    if (quiz.createdById !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const results = await prisma.result.findMany({
      where: { quizId },
      include: {
        student: { select: { fullName: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = results.map((r) => ({
      id: r.id,
      studentName: r.student?.fullName ?? "Unknown",
      email: r.student?.email ?? "",
      score: r.score,
      totalQuestions: r.total,
      percentage: r.total > 0 ? Math.round((r.score / r.total) * 100) : 0,
      timeTaken: r.timeTaken,
      submittedAt: r.createdAt,
    }));

    return NextResponse.json({ results: formatted });
  } catch (error) {
    console.error("[ANALYTICS ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
