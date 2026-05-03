import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BookOpen, FileJson, BarChart3, Eye } from "lucide-react";

export const metadata = { title: "All Quizzes — MCQify Admin" };

export default async function AdminQuizzesPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  type QuizRow = Awaited<ReturnType<typeof prisma.quiz.findMany<{
    include: { createdBy: { select: { fullName: true; username: true } }; _count: { select: { questions: true; results: true } } };
  }>>>[number];

  const quizzes: QuizRow[] = await prisma.quiz.findMany({
    include: {
      createdBy: { select: { fullName: true, username: true } },
      _count: { select: { questions: true, results: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold gradient-text">All Quizzes</h1>
        <p className="text-muted-foreground text-sm mt-1">{quizzes.length} total quizzes on platform</p>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {["Title", "Creator", "Status", "Questions", "Attempts", "Created At", "Last Modified"].map((h) => (
                  <th key={h} className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {quizzes.map((quiz) => (
                <tr key={quiz.id} className="hover:bg-white/2 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-sm max-w-[200px] truncate">{quiz.title}</p>
                    {quiz.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{quiz.description}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm">{quiz.createdBy.fullName}</p>
                    <p className="text-xs text-muted-foreground">@{quiz.createdBy.username}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${quiz.isPublished
                        ? "text-green-400 bg-green-400/10 border-green-400/20"
                        : "text-yellow-400 bg-yellow-400/10 border-yellow-400/20"
                      }`}>
                      {quiz.isPublished ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-sm text-center">{quiz._count.questions}</td>
                  <td className="px-5 py-4 text-sm text-center">{quiz._count.results}</td>
                  <td className="px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(quiz.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                  <td className="px-5 py-4 text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(quiz.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
