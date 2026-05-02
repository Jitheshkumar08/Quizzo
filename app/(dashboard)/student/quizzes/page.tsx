import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { BookOpen, Clock, Users, ArrowRight, Search } from "lucide-react";

export const metadata = { title: "Browse Quizzes — MCQify" };

export default async function StudentQuizzesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const quizzes = await prisma.quiz.findMany({
    where: { isPublished: true },
    include: {
      createdBy: { select: { fullName: true } },
      _count: { select: { questions: true, results: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold gradient-text">Browse Quizzes</h1>
        <p className="text-muted-foreground text-sm mt-1">{quizzes.length} published quiz{quizzes.length !== 1 ? "zes" : ""} available</p>
      </div>

      {/* Quiz cards */}
      {quizzes.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-semibold text-lg">No quizzes available yet</p>
          <p className="text-sm text-muted-foreground mt-1">Check back soon — instructors are creating quizzes for you</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quizzes.map((quiz) => (
            <Link
              key={quiz.id}
              href={`/student/quizzes/${quiz.id}`}
              className="glass glass-hover rounded-2xl p-5 space-y-4 group flex flex-col"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, hsl(262 80% 65% / 0.2), hsl(199 89% 48% / 0.2))" }}>
                <BookOpen className="w-6 h-6 text-purple-400" />
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="font-semibold text-foreground group-hover:text-purple-300 transition-colors line-clamp-2">
                  {quiz.title}
                </h3>
                {quiz.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{quiz.description}</p>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> {quiz._count.questions} Qs
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" /> {quiz._count.results} attempts
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-xs text-muted-foreground">by {quiz.createdBy.fullName}</span>
                <span className="flex items-center gap-1 text-purple-400 text-xs font-medium group-hover:gap-2 transition-all">
                  Start Quiz <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
