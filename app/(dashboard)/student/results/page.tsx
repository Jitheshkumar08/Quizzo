import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Trophy, Clock, BookOpen } from "lucide-react";
import ViewAnalyticsButton from "@/components/ui/ViewAnalyticsButton";
import { formatAppDateTime } from "@/lib/timezone";
import ResultListRealtimeRefresh from "@/components/live/ResultListRealtimeRefresh";

export const metadata = { title: "My Results — MCQify" };

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDateTime(date: Date) {
  return formatAppDateTime(date);
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
      <ResultListRealtimeRefresh />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Results</h1>
        <p className="text-gray-500 font-medium text-sm mt-1">{results.length} quiz attempt{results.length !== 1 ? "s" : ""}</p>
      </div>

      {results.length === 0 ? (
        <div className="bg-white rounded-[32px] p-16 text-center shadow-sm border border-black/5">
          <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="font-bold text-xl text-gray-900">No results yet</p>
          <p className="text-sm text-gray-500 font-medium mt-2">Take a quiz to see your results here</p>
          <Link href="/student/quizzes" className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-2xl text-sm font-bold text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all"
            style={{ background: "linear-gradient(135deg, hsl(262 80% 65%), hsl(199 89% 48%))" }}>
            <BookOpen className="w-4 h-4" /> Browse Quizzes
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((result) => {
            const pct = Math.round((result.score / result.total) * 100);
            
            let color = "text-red-500";
            let bgColor = "bg-[#FFF0F0] border-[#FFE5E5]";
            if (pct >= 75) {
              color = "text-green-500";
              bgColor = "bg-[#F0FFF4] border-[#E6FFEC]";
            } else if (pct >= 50) {
              color = "text-yellow-600";
              bgColor = "bg-[#FFFAF0] border-[#FFF3E0]";
            }

            return (
              <Link
                key={result.id}
                href={`/student/results/${result.id}`}
                className="bg-white hover:bg-gray-50/50 transition-all duration-300 rounded-[28px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 border border-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] group hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-start sm:items-center gap-4 sm:gap-6 flex-1 min-w-0">
                  {/* Score badge */}
                  <div className={`w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] rounded-[18px] sm:rounded-[20px] flex flex-col items-center justify-center flex-shrink-0 border ${bgColor} transition-transform duration-300 group-hover:scale-105`}>
                    <span className={`text-[22px] sm:text-[26px] font-black ${color}`}>{pct}%</span>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-bold text-[17px] sm:text-[19px] text-gray-900 group-hover:text-[#A881FF] transition-colors break-words line-clamp-2 mb-2 sm:truncate sm:line-clamp-none">
                      {result.quiz.title}
                    </h3>

                    <div className="flex items-center flex-wrap gap-x-4 sm:gap-x-6 gap-y-2 text-[13px] sm:text-[14px] text-gray-700 font-semibold">
                      <span className="flex items-center gap-1.5 whitespace-nowrap">
                        <Trophy className="w-[14px] h-[14px] sm:w-[16px] sm:h-[16px] text-yellow-500 fill-yellow-500/20" />
                        {result.score}/{result.total} correct
                      </span>
                      {result.timeTaken && (
                        <span className="flex items-center gap-1.5 whitespace-nowrap">
                          <Clock className="w-[14px] h-[14px] sm:w-[16px] sm:h-[16px] text-blue-500" />
                          {formatTime(result.timeTaken)}
                        </span>
                      )}
                      <span className="text-gray-500 sm:text-gray-600 font-medium whitespace-nowrap w-full sm:w-auto">
                        {formatDateTime(new Date(result.createdAt))}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 self-end sm:self-auto sm:pl-4 sm:pr-2">
                  <ViewAnalyticsButton />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
