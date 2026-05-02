import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import QuizTaker from "@/components/quiz/QuizTaker";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TakeQuizPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id, isPublished: true },
    include: {
      questions: {
        orderBy: { order: "asc" },
        select: { id: true, questionText: true, options: true, order: true },
      },
    },
  });

  if (!quiz) redirect("/student/quizzes");

  return (
    <div>
      <QuizTaker
        quizId={quiz.id}
        quizTitle={quiz.title}
        questions={quiz.questions as { id: string; questionText: string; options: { A: string; B: string; C: string; D: string }; order: number }[]}
      />
    </div>
  );
}
