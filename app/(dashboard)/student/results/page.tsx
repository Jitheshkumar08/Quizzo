import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Trophy, Clock, BookOpen, ArrowRight } from "lucide-react";

export const metadata = { title: "My Results — MCQify" };

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default async function StudentResultsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const results = await prisma.result.findMany({
    where: { studentId: session.user.id },
    include: {
      quiz: { select: { title: true, id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-2xl font-bold gradient-text">My Results</h1>
        <p className="text-muted-foreground text-sm mt-1">{results.length} quiz attempt{results.length !== 1 ? "s" : ""}</p>
      </div>

      {results.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-semibold text-lg">No results yet</p>
          <p className="text-sm text-muted-foreground mt-1">Take a quiz to see your results here</p>
          <Link href="/student/quizzes" className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, hsl(262 80% 65%), hsl(199 89% 48%))" }}>
            <BookOpen className="w-4 h-4" /> Browse Quizzes
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {results.map((result) => {
            const pct = Math.round((result.score / result.total) * 100);
            const color = pct >= 75 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400";
            const bgColor = pct >= 75 ? "bg-green-400/10 border-green-400/20" : pct >= 50 ? "bg-yellow-400/10 border-yellow-400/20" : "bg-red-400/10 border-red-400/20";
            return (
              <Link
                key={result.id}
                href={`/student/results/${result.id}`}
                className="glass glass-hover rounded-2xl p-5 flex items-center gap-4 group"
              >
                {/* Score badge */}
                <div className={`w-16 h-16 rounded-xl flex flex-col items-center justify-center flex-shrink-0 border ${bgColor}`}>
                  <span className={`text-2xl font-black ${color}`}>{pct}%</span>
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold group-hover:text-purple-300 transition-colors truncate">
                    {result.quiz.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span><Trophy className="w-3 h-3 inline mr-1" />{result.score}/{result.total} correct</span>
                    {result.timeTaken && (
                      <span><Clock className="w-3 h-3 inline mr-1" />{formatTime(result.timeTaken)}</span>
                    )}
                    <span>{new Date(result.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-purple-400 transition-colors flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
