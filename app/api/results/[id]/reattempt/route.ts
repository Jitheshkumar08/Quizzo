import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseAnswerMap, parseStringArray } from "@/lib/reattempt-utils";
import { buildResultReviewSnapshot, parseResultReviewSnapshot } from "@/lib/result-review";

export const maxDuration = 30;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const result = await prisma.result.findUnique({
      where: { id },
      select: {
        id: true,
        quizId: true,
        studentId: true,
        userAnswers: true,
        questionIds: true,
        quiz: {
          select: {
            questions: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                questionText: true,
                options: true,
                correctAnswer: true,
                explanation: true,
                order: true,
              },
            },
          },
        },
      },
    });

    if (!result || result.studentId !== session.user.id) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    const reviewSnapshot = parseResultReviewSnapshot(result.questionIds);
    const coveredQuestionIds = parseStringArray(result.questionIds);
    const coveredSet = coveredQuestionIds ? new Set(coveredQuestionIds) : null;
    const coveredQuestions = reviewSnapshot?.questions ?? result.quiz.questions.filter((question) =>
      coveredSet ? coveredSet.has(question.id) : true
    );

    const userAnswers = parseAnswerMap(result.userAnswers);
    const missedQuestions = coveredQuestions
      .filter((question) => userAnswers[question.id] !== question.correctAnswer)
      .map((question, index) => ({ ...question, order: question.order ?? index }));

    if (missedQuestions.length === 0) {
      return NextResponse.json(
        { error: "There are no incorrect or unattempted questions to re-attempt." },
        { status: 400 }
      );
    }

    const existing = await prisma.$queryRaw<{ id: string }[]>`
      SELECT "id"
      FROM "RemedialQuizSession"
      WHERE "sourceResultId" = ${result.id}
        AND "studentId" = ${session.user.id}
        AND "submittedAt" IS NULL
      ORDER BY "createdAt" DESC
      LIMIT 1
    `;

    if (existing[0]) {
      return NextResponse.json({ sessionId: existing[0].id });
    }

    const missedQuestionIdsJson = JSON.stringify(buildResultReviewSnapshot(missedQuestions));
    const created = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "RemedialQuizSession" (
        "id",
        "sourceResultId",
        "quizId",
        "studentId",
        "questionIds",
        "currentAnswers"
      )
      VALUES (
        gen_random_uuid()::text,
        ${result.id},
        ${result.quizId},
        ${session.user.id},
        ${missedQuestionIdsJson}::jsonb,
        '{}'::jsonb
      )
      RETURNING "id"
    `;

    return NextResponse.json({ sessionId: created[0]?.id });
  } catch (error) {
    console.error("[REATtempt START ERROR]", error);
    return NextResponse.json({ error: "Failed to start re-attempt" }, { status: 500 });
  }
}
