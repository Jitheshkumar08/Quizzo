import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cleanAnswerMap, parseStringArray } from "@/lib/reattempt-utils";

export const maxDuration = 30;

interface RemedialSessionRow {
  id: string;
  studentId: string;
  questionIds: unknown;
  submittedAt: Date | null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const rows = await prisma.$queryRaw<RemedialSessionRow[]>`
      SELECT "id", "studentId", "questionIds", "submittedAt"
      FROM "RemedialQuizSession"
      WHERE "id" = ${id}
      LIMIT 1
    `;

    const remedialSession = rows[0];
    if (!remedialSession || remedialSession.studentId !== session.user.id) {
      return NextResponse.json({ error: "Re-attempt session not found" }, { status: 404 });
    }

    if (remedialSession.submittedAt) {
      return NextResponse.json({ error: "This re-attempt is already submitted" }, { status: 409 });
    }

    const body = await req.json();
    const questionIds = parseStringArray(remedialSession.questionIds) ?? [];
    const answers = cleanAnswerMap(body?.userAnswers, new Set(questionIds));
    const answersJson = JSON.stringify(answers);

    await prisma.$executeRaw`
      UPDATE "RemedialQuizSession"
      SET "currentAnswers" = ${answersJson}::jsonb,
          "updatedAt" = NOW()
      WHERE "id" = ${id}
        AND "studentId" = ${session.user.id}
        AND "submittedAt" IS NULL
    `;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[REATtempt AUTOSAVE ERROR]", error);
    return NextResponse.json({ error: "Failed to autosave re-attempt" }, { status: 500 });
  }
}
