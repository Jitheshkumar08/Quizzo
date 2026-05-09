import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessQuizAnalytics, canManageQuizGlobally } from "@/lib/roles";

export const dynamic = "force-dynamic";

function quizIdFromPathname(pathname: string): string | undefined {
  const m = pathname.match(/\/api\/quiz\/([^/]+)\/analytics\/?$/);
  return m?.[1];
}

interface AnalyticsResultRow {
  id: string;
  studentName: string | null;
  username: string | null;
  profileImageUrl: string | null;
  score: number;
  total: number;
  timeTaken: number | null;
  createdAt: Date;
}

// GET /api/quiz/[id]/analytics — instructor fetches all attempt results for a quiz
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !canAccessQuizAnalytics(session.user.role)) {
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

    if (quiz.createdById !== session.user.id && !canManageQuizGlobally(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const results = await prisma.$queryRaw<AnalyticsResultRow[]>`
      SELECT
        r."id",
        u."fullName" AS "studentName",
        u."username",
        u."profileImageUrl",
        r."score",
        r."total",
        r."timeTaken",
        r."createdAt"
      FROM "Result" r
      LEFT JOIN "User" u ON u."id" = r."studentId"
      WHERE r."quizId" = ${quizId}
        AND COALESCE(r."attemptType", 'NORMAL') = 'NORMAL'
      ORDER BY r."createdAt" DESC
    `;

    const formatted = results.map((r) => ({
      id: r.id,
      studentName: r.studentName ?? "Unknown",
      username: r.username ?? "",
      profileImageUrl: r.profileImageUrl,
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
