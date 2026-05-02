import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import EditQuizClient from "./EditQuizClient";

export default async function EditQuizPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  const { id } = await params;

  const quiz = await prisma.quiz.findUnique({
    where: { id },
    include: {
      questions: {
        orderBy: { order: "asc" },
      },
    },
  });

  if (!quiz) {
    redirect("/instructor/quizzes");
  }

  // Ensure they have permission
  if (quiz.createdById !== session.user.id && session.user.role !== "ADMIN") {
    redirect("/instructor/quizzes");
  }

  return <EditQuizClient quiz={quiz} />;
}
