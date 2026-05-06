import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import QuizTaker from "@/components/quiz/QuizTaker";
import { parseAnswerMap, parseStringArray, reattemptResultTitle } from "@/lib/reattempt-utils";

interface Props {
  params: Promise<{ id: string }>;
}

interface RemedialSessionRow {
  id: string;
  quizId: string;
  studentId: string;
  questionIds: unknown;
  currentAnswers: unknown;
  submittedAt: Date | null;
  resultId: string | null;
  title: string;
  description: string | null;
  shuffleOptions: boolean;
}

interface QuestionPayload {
  id: string;
  questionText: string;
  options: { A: string; B: string; C: string; D: string };
  order: number;
}

export default async function ReattemptQuizPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const rows = await prisma.$queryRaw<RemedialSessionRow[]>`
    SELECT
      rs."id",
      rs."quizId",
      rs."studentId",
      rs."questionIds",
      rs."currentAnswers",
      rs."submittedAt",
      rs."resultId",
      q."title",
      q."description",
      q."shuffleOptions"
    FROM "RemedialQuizSession" rs
    INNER JOIN "Quiz" q ON q."id" = rs."quizId"
    WHERE rs."id" = ${id}
    LIMIT 1
  `;

  const remedialSession = rows[0];
  if (!remedialSession || remedialSession.studentId !== session.user.id) {
    redirect("/student/results");
  }

  if (remedialSession.submittedAt) {
    redirect(remedialSession.resultId ? `/student/results/${remedialSession.resultId}` : "/student/results");
  }

  const questionIds = parseStringArray(remedialSession.questionIds) ?? [];
  if (questionIds.length === 0) {
    redirect("/student/results");
  }

  const selectedQuestions = await prisma.question.findMany({
    where: {
      quizId: remedialSession.quizId,
      id: { in: questionIds },
    },
    select: {
      id: true,
      questionText: true,
      options: true,
      order: true,
    },
    orderBy: { order: "asc" },
  });

  const questions = selectedQuestions.map((question) => ({
    id: question.id,
    questionText: question.questionText,
    options: question.options as QuestionPayload["options"],
    order: question.order,
  }));

  if (questions.length === 0) {
    redirect("/student/results");
  }

  return (
    <QuizTaker
      quizId={remedialSession.quizId}
      quizTitle={reattemptResultTitle(remedialSession.title)}
      quizDescription={remedialSession.description}
      questions={questions}
      sessionId={remedialSession.id}
      shuffleQuestions={false}
      shuffleOptions={remedialSession.shuffleOptions}
      savedAnswers={parseAnswerMap(remedialSession.currentAnswers)}
      autosaveUrl={`/api/reattempts/${remedialSession.id}/autosave`}
      submitUrl={`/api/reattempts/${remedialSession.id}/submit`}
    />
  );
}
