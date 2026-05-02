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

  const exists = await prisma.quiz.findFirst({
    where: { id, isPublished: true },
    select: { id: true },
  });

  if (!exists) redirect("/student/quizzes");

  return (
    <div>
      <QuizGate quizId={id} />
    </div>
  );
}
