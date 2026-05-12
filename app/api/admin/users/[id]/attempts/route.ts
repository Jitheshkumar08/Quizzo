import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessAdminControls } from "@/lib/roles";
import { withDatabaseRetry } from "@/lib/db-retry";

export const dynamic = "force-dynamic";

interface UserAttemptRow {
  id: string;
  quizId: string;
  quizTitle: string | null;
  titleOverride: string | null;
  attemptType: string | null;
  score: number;
  total: number;
  timeTaken: number | null;
  createdAt: Date;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || !canAccessAdminControls(session.user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id: userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    const user = await withDatabaseRetry(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          username: true,
          profileImageUrl: true,
        },
      })
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const attempts = await withDatabaseRetry(() =>
      prisma.$queryRaw<UserAttemptRow[]>`
        SELECT
          r."id",
          r."quizId",
          q."title" AS "quizTitle",
          r."titleOverride",
          r."attemptType",
          r."score",
          r."total",
          r."timeTaken",
          r."createdAt"
        FROM "Result" r
        LEFT JOIN "Quiz" q ON q."id" = r."quizId"
        WHERE r."studentId" = ${userId}
        ORDER BY r."createdAt" DESC
      `
    );

    return NextResponse.json({
      user,
      results: attempts.map((attempt) => ({
        id: attempt.id,
        quizId: attempt.quizId,
        quizTitle: attempt.titleOverride ?? attempt.quizTitle ?? "Untitled quiz",
        attemptType: attempt.attemptType ?? "NORMAL",
        score: attempt.score,
        totalQuestions: attempt.total,
        percentage: attempt.total > 0 ? Math.round((attempt.score / attempt.total) * 100) : 0,
        timeTaken: attempt.timeTaken,
        submittedAt: attempt.createdAt,
      })),
    });
  } catch (error) {
    console.error("[USER ATTEMPTS ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch user attempts" }, { status: 500 });
  }
}
