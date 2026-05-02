import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentQuizBlock } from "@/lib/quiz-guard-student";

export const maxDuration = 60;

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

    const { id: quizId } = await params;
    const body = await req.json();
    const { userAnswers, timeTaken } = body as {
      userAnswers: Record<string, string>;
      timeTaken?: number;
    };

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId, isPublished: true },
      include: { questions: { orderBy: { order: "asc" } } },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const block = await getStudentQuizBlock(req, quiz, session);
    if (block) {
      const messages: Record<string, string> = {
        NOT_STARTED: "This quiz is not available yet.",
        ENDED: "This quiz has ended.",
        MAX_ATTEMPTS: "You have already completed this quiz.",
        PASSWORD_REQUIRED: "Quiz password required.",
      };
      return NextResponse.json(
        { error: messages[block.code] ?? "Cannot submit", code: block.code },
        { status: 403 }
      );
    }

    // Server-side scoring
    let score = 0;
    const breakdown = (quiz.questions as unknown as QuestionWithAnswer[]).map((q) => {
      const selected = userAnswers[q.id] ?? null;
      const isCorrect = selected === q.correctAnswer;
      if (isCorrect) score++;
      return {
        questionId: q.id,
        questionText: q.questionText,
        options: q.options,
        selected,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        isCorrect,
      };
    });

    const total = quiz.questions.length;

    // Save result to DB
    const result = await prisma.result.create({
      data: {
        quizId,
        studentId: session.user.id,
        score,
        total,
        timeTaken: timeTaken ?? null,
        userAnswers,
      },
    });

    return NextResponse.json({
      resultId: result.id,
      score,
      total,
      percentage: Math.round((score / total) * 100),
      timeTaken: result.timeTaken,
      quizTitle: quiz.title,
      breakdown,
    });
  } catch (error) {
    console.error("[SUBMIT ERROR]", error);
    return NextResponse.json({ error: "Failed to submit quiz" }, { status: 500 });
  }
}
