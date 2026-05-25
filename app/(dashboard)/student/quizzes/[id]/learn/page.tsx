import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, BookOpen, GraduationCap } from "lucide-react";
import LearnQuestionsClient from "./LearnQuestionsClient";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const quiz = await prisma.quiz.findFirst({
    where: { id },
    select: { title: true },
  });
  return { title: quiz ? `Study: ${quiz.title}` : "Study Mode" };
}

export default async function LearnPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const isPrivileged =
    session.user.role === "ADMIN" || session.user.role === "MOD";
  const isInstructor = session.user.role === "INSTRUCTOR";

  const quiz = await prisma.quiz.findFirst({
    where: {
      id,
      ...(isPrivileged
        ? {}
        : isInstructor
        ? { OR: [{ isPublished: true }, { createdById: session.user.id }] }
        : { isPublished: true }),
    },
    select: {
      id: true,
      title: true,
      description: true,
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
  });

  if (!quiz) redirect("/student/quizzes");

  return (
    <div className="flex flex-col gap-6 animate-fade-in-up">
      <Link
        href={`/student/quizzes/${id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Quiz
      </Link>

      {/* Header card */}
      <div className="relative overflow-hidden rounded-[24px] p-5 sm:p-7 border bg-gradient-to-br from-violet-50 via-white to-purple-50 border-violet-100 text-center space-y-3 shadow-[0_14px_42px_rgba(15,23,42,0.07)]">
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 shadow-[0_10px_25px_rgba(15,23,42,0.1)]">
          <GraduationCap className="w-7 h-7 text-white drop-shadow-sm" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-950 break-words tracking-tight">
          {quiz.title}
        </h1>
        {quiz.description && (
          <p className="text-sm text-slate-500">{quiz.description}</p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-bold border border-violet-200">
            <BookOpen className="w-3.5 h-3.5" /> {quiz.questions.length}{" "}
            {quiz.questions.length === 1 ? "Question" : "Questions"}
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            Study Mode
          </span>
        </div>
      </div>

      <LearnQuestionsClient questions={quiz.questions} />
    </div>
  );
}
