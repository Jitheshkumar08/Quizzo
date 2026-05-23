import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import QuizGate from "@/components/quiz/QuizGate";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TakeQuizPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const quiz = await prisma.quiz.findFirst({
    where: { id, isPublished: true },
    select: {
      id: true,
      title: true,
      shareSlug: true,
      description: true,
      accessPasswordHash: true,
      allowMultipleAttempts: true,
      scheduledStart: true,
      scheduledEnd: true,
      timeLimitMinutes: true,
      updatedAt: true,
      createdBy: { select: { fullName: true, username: true } },
      _count: { select: { questions: true } },
    },
  });

  if (!quiz) redirect("/student/quizzes");

  const totalAttempts = await prisma.result.count({
    where: {
      quizId: quiz.id,
      attemptType: "NORMAL",
    },
  });

  return (
    <div>
      <QuizGate
        key={quiz.updatedAt.toISOString()}
        quizId={id}
        startSummary={{
          id: quiz.id,
          title: quiz.title,
          sharePath: quiz.shareSlug ? `/quiz/${quiz.shareSlug}` : `/student/quizzes/${quiz.id}`,
          description: quiz.description,
          totalAttempts,
          questionCount: quiz._count.questions,
          passwordProtected: !!quiz.accessPasswordHash,
          allowMultipleAttempts: quiz.allowMultipleAttempts,
          scheduledStart: quiz.scheduledStart?.toISOString() ?? null,
          scheduledEnd: quiz.scheduledEnd?.toISOString() ?? null,
          timeLimitMinutes: quiz.timeLimitMinutes,
          createdByName: quiz.createdBy.fullName || quiz.createdBy.username,
        }}
      />
    </div>
  );
}
