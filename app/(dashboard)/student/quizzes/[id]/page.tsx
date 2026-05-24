import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import QuizGate from "@/components/quiz/QuizGate";
import { finalizeExpiredOpenSession } from "@/lib/quiz-session";

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
      isClosed: true,
      scheduledStart: true,
      scheduledEnd: true,
      timeLimitMinutes: true,
      updatedAt: true,
      createdBy: { select: { fullName: true, username: true } },
      _count: { select: { questions: true } },
    },
  });

  if (!quiz) redirect("/student/quizzes");

  const now = new Date();

  if (quiz.timeLimitMinutes || quiz.scheduledEnd) {
    await finalizeExpiredOpenSession({
      quizId: quiz.id,
      studentId: session.user.id,
      timeLimitMinutes: quiz.timeLimitMinutes,
      scheduledEnd: quiz.scheduledEnd,
      totalQuestions: quiz._count.questions,
    });
  }

  const [totalAttempts, activeSession, studentNormalAttempts] = await Promise.all([
    prisma.result.count({
      where: {
        quizId: quiz.id,
        attemptType: "NORMAL",
      },
    }),
    prisma.quizSession.findFirst({
      where: {
        quizId: quiz.id,
        studentId: session.user.id,
        submittedAt: null,
      },
      select: { startedAt: true },
    }),
    prisma.result.count({
      where: {
        quizId: quiz.id,
        studentId: session.user.id,
        attemptType: "NORMAL",
      },
    }),
  ]);

  const quizClosed = quiz.isClosed || (!!quiz.scheduledEnd && now > quiz.scheduledEnd);
  const initialBlock = (() => {
    if (quiz.scheduledStart && quiz.scheduledEnd && now < quiz.scheduledStart) {
      return {
        title: quiz.title,
        code: "NOT_STARTED",
        error: "This quiz is not available yet.",
        scheduledStart: quiz.scheduledStart.toISOString(),
      };
    }

    if (!quizClosed && !quiz.allowMultipleAttempts && studentNormalAttempts >= 1) {
      return {
        title: quiz.title,
        code: "MAX_ATTEMPTS",
        error: "You have already completed this quiz.",
        attemptsUsed: studentNormalAttempts,
      };
    }

    return null;
  })();

  return (
    <div className="lg:-mt-8 xl:-mt-10">
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
          closed: quizClosed,
          scheduledStart: quiz.scheduledStart?.toISOString() ?? null,
          scheduledEnd: quiz.scheduledEnd?.toISOString() ?? null,
          timeLimitMinutes: quiz.timeLimitMinutes,
          createdByName: quiz.createdBy.fullName || quiz.createdBy.username,
          activeSessionStartedAt: activeSession?.startedAt.toISOString() ?? null,
          serverNow: now.toISOString(),
        }}
        initialBlock={initialBlock}
      />
    </div>
  );
}
