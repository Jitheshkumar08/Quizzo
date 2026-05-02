import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, BookOpen, Eye, EyeOff, FileJson, BarChart3 } from "lucide-react";

export const metadata = { title: "My Quizzes — MCQify" };

export default async function InstructorQuizzesPage() {
  const session = await auth();
  if (!session || (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  const where = session.user.role === "ADMIN" ? {} : { createdById: session.user.id };

  type QuizRow = Awaited<ReturnType<typeof prisma.quiz.findMany<{
    include: { createdBy: { select: { fullName: true } }; _count: { select: { questions: true; results: true } } };
  }>>>[number];

  const quizzes: QuizRow[] = await prisma.quiz.findMany({
    where,
    include: {
      createdBy: { select: { fullName: true } },
      _count: { select: { questions: true, results: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">
            {session.user.role === "ADMIN" ? "All Quizzes" : "My Quizzes"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""}</p>
        </div>
        <Link
          href="/instructor/upload"
          className="animated-button shadow-sm"
        >
          <svg viewBox="0 0 24 24" className="arr-2" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"></path>
          </svg>
          <span className="text">NEW QUIZ</span>
          <span className="circle"></span>
          <svg viewBox="0 0 24 24" className="arr-1" xmlns="http://www.w3.org/2000/svg">
            <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"></path>
          </svg>
        </Link>
      </div>

      {/* Quiz list */}
      {quizzes.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-semibold text-lg">No quizzes yet</p>
          <p className="text-muted-foreground text-sm mt-1">Upload a PDF to generate your first quiz</p>
          <Link href="/instructor/upload" className="animated-button shadow-sm mt-6 inline-flex">
            <svg viewBox="0 0 24 24" className="arr-2" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"></path>
            </svg>
            <span className="text">CREATE QUIZ</span>
            <span className="circle"></span>
            <svg viewBox="0 0 24 24" className="arr-1" xmlns="http://www.w3.org/2000/svg">
              <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"></path>
            </svg>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="glass glass-hover rounded-2xl p-5 flex items-start gap-4">
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-purple-500/15 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-purple-400" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <h3 className="font-semibold text-foreground">{quiz.title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                    quiz.isPublished
                      ? "text-green-400 bg-green-400/10 border-green-400/20"
                      : "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
                  }`}>
                    {quiz.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
                {quiz.description && (
                  <p className="text-sm text-muted-foreground mt-0.5 truncate">{quiz.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {quiz._count.questions} questions</span>
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {quiz._count.results} attempts</span>
                  {session.user.role === "ADMIN" && (
                    <span>by {quiz.createdBy.fullName}</span>
                  )}
                  <span>{new Date(quiz.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {quiz.jsonBlobUrl && (
                  <a
                    href={quiz.jsonBlobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg text-muted-foreground hover:text-cyan-400 hover:bg-cyan-400/10 transition-all"
                    title="Download JSON"
                  >
                    <FileJson className="w-4 h-4" />
                  </a>
                )}
                <Link
                  href={`/instructor/quizzes/${quiz.id}/edit`}
                  className="px-3 py-1.5 rounded-lg text-sm text-purple-400 hover:bg-purple-400/10 transition-all border border-purple-400/20"
                >
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
