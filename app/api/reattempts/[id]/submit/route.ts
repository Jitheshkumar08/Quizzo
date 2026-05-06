import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordResultListEvent } from "@/lib/result-list-events";
import {
  cleanAnswerMap,
  MISSED_REATTEMPT_TYPE,
  parseStringArray,
  reattemptResultTitle,
} from "@/lib/reattempt-utils";

export const maxDuration = 60;

interface RemedialSessionRow {
  id: string;
  sourceResultId: string;
  quizId: string;
  studentId: string;
  questionIds: unknown;
  submittedAt: Date | null;
  resultId: string | null;
}

interface QuestionWithAnswer {
  id: string;
  questionText: string;
  options: unknown;
  correctAnswer: string;
  explanation: string | null;
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
    const body = await req.json();
    const timeTaken =
      typeof body?.timeTaken === "number" && Number.isFinite(body.timeTaken)
        ? Math.max(0, Math.floor(body.timeTaken))
        : null;

    const rows = await prisma.$queryRaw<RemedialSessionRow[]>`
      SELECT "id", "sourceResultId", "quizId", "studentId", "questionIds", "submittedAt", "resultId"
      FROM "RemedialQuizSession"
      WHERE "id" = ${id}
      LIMIT 1
    `;

    const remedialSession = rows[0];
    if (!remedialSession || remedialSession.studentId !== session.user.id) {
      return NextResponse.json({ error: "Re-attempt session not found" }, { status: 404 });
    }

    if (remedialSession.submittedAt) {
      if (remedialSession.resultId) {
        return NextResponse.json({ resultId: remedialSession.resultId });
      }
      return NextResponse.json({ error: "This re-attempt is already submitted" }, { status: 409 });
    }

    const questionIds = parseStringArray(remedialSession.questionIds) ?? [];
    if (questionIds.length === 0) {
      return NextResponse.json({ error: "No questions found for this re-attempt" }, { status: 400 });
    }

    const quiz = await prisma.quiz.findUnique({
      where: { id: remedialSession.quizId },
      select: {
        title: true,
        questions: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            questionText: true,
            options: true,
            correctAnswer: true,
            explanation: true,
          },
        },
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const questionSet = new Set(questionIds);
    const questions = (quiz.questions as unknown as QuestionWithAnswer[]).filter((question) =>
      questionSet.has(question.id)
    );

    if (questions.length === 0) {
      return NextResponse.json({ error: "No questions found for this re-attempt" }, { status: 400 });
    }

    const finalAnswers = cleanAnswerMap(body?.userAnswers, questionSet);
    let score = 0;
    const breakdown = questions.map((question) => {
      const selected = finalAnswers[question.id] ?? null;
      const isCorrect = selected === question.correctAnswer;
      if (isCorrect) score++;
      return {
        questionId: question.id,
        questionText: question.questionText,
        options: question.options,
        selected,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        isCorrect,
      };
    });

    const total = questions.length;
    const answersJson = JSON.stringify(finalAnswers);
    const questionIdsJson = JSON.stringify(questions.map((question) => question.id));
    const titleOverride = reattemptResultTitle(quiz.title);

    const result = await prisma.$transaction(async (tx) => {
      const created = await tx.$queryRaw<{ id: string; timeTaken: number | null }[]>`
        INSERT INTO "Result" (
          "id",
          "quizId",
          "studentId",
          "score",
          "total",
          "timeTaken",
          "userAnswers",
          "titleOverride",
          "questionIds",
          "sourceResultId",
          "attemptType"
        )
        VALUES (
          gen_random_uuid()::text,
          ${remedialSession.quizId},
          ${session.user.id},
          ${score},
          ${total},
          ${timeTaken},
          ${answersJson}::jsonb,
          ${titleOverride},
          ${questionIdsJson}::jsonb,
          ${remedialSession.sourceResultId},
          ${MISSED_REATTEMPT_TYPE}
        )
        RETURNING "id", "timeTaken"
      `;

      const createdResult = created[0];
      if (!createdResult) {
        throw new Error("Result insert did not return a row");
      }

      await tx.$executeRaw`
        UPDATE "RemedialQuizSession"
        SET "submittedAt" = NOW(),
            "resultId" = ${createdResult.id},
            "currentAnswers" = ${answersJson}::jsonb,
            "updatedAt" = NOW()
        WHERE "id" = ${remedialSession.id}
          AND "studentId" = ${session.user.id}
          AND "submittedAt" IS NULL
      `;

      await recordResultListEvent(tx, {
        quizId: remedialSession.quizId,
        resultId: createdResult.id,
        action: "result.created",
      });

      return createdResult;
    });

    return NextResponse.json({
      resultId: result.id,
      score,
      total,
      percentage: Math.round((score / total) * 100),
      timeTaken: result.timeTaken,
      quizTitle: titleOverride,
      breakdown,
    });
  } catch (error) {
    console.error("[REATtempt SUBMIT ERROR]", error);
    return NextResponse.json({ error: "Failed to submit re-attempt" }, { status: 500 });
  }
}
