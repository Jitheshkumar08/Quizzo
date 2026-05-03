import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { BookOpen, Users, ArrowRight, Lock, CalendarRange } from "lucide-react";
import { getScheduleStatus } from "@/lib/quiz-student-access";
import TimerBadge from "@/components/quiz/TimerBadge";

export const metadata = { title: "Browse Quizzes — MCQify" };

export default async function StudentQuizzesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const openSessions = await prisma.quizSession.findMany({
    where: { studentId: session.user.id, submittedAt: null },
    select: { quizId: true, startedAt: true }
  });
  const openQuizMap = new Map(openSessions.map((s) => [s.quizId, s.startedAt]));

  const quizRows = await prisma.quiz.findMany({
    where: { isPublished: true },
    include: {
      createdBy: { select: { fullName: true } },
      _count: { select: { questions: true, results: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const quizzes = quizRows.map(({ accessPasswordHash, ...quiz }) => ({
    ...quiz,
    passwordProtected: !!accessPasswordHash,
  }));

  const now = new Date();

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => {
            const hasSchedule = !!(quiz.scheduledStart && quiz.scheduledEnd);
            const sched = hasSchedule
              ? getScheduleStatus(now, quiz.scheduledStart, quiz.scheduledEnd)
              : "none";
            return (
              <div
                key={quiz.id}
                className="relative overflow-hidden rounded-3xl p-6 space-y-5 group flex flex-col transition-all duration-300 border border-black/5 hover:border-purple-500/30 bg-white shadow-sm hover:shadow-xl hover:shadow-purple-500/10"
              >
                {/* Header */}
                <div className="flex items-start justify-between relative z-10">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-purple-500/10 text-purple-600 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  {sched === "ended" ? (
                    <div className="px-3 py-1 rounded-full bg-red-50 text-xs font-bold uppercase tracking-wider text-red-600 border border-red-200 shadow-sm opacity-100">
                      Ended
                    </div>
                  ) : openQuizMap.has(quiz.id) ? (
                    <TimerBadge
                      startTime={openQuizMap.get(quiz.id)!}
                      timeLimitMinutes={quiz.timeLimitMinutes}
                      scheduledEnd={quiz.scheduledEnd}
                    />
                  ) : (
                    <div className="px-3 py-1 rounded-full bg-purple-100 text-xs font-bold uppercase tracking-wider text-purple-700 border border-purple-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                      Start
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 relative z-10">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {quiz.passwordProtected && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-800 border border-amber-100">
                        <Lock className="w-3 h-3" /> Password
                      </span>
                    )}
                    {hasSchedule && sched === "upcoming" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-blue-50 text-blue-800 border border-blue-100">
                        <CalendarRange className="w-3 h-3" /> Upcoming
                      </span>
                    )}
                    {hasSchedule && sched === "ended" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-600 border border-gray-200">
                        Closed
                      </span>
                    )}
                    {!quiz.allowMultipleAttempts && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-slate-50 text-slate-700 border border-slate-100">
                        1 attempt
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors duration-300 line-clamp-2">
                    {quiz.title}
                  </h3>
                  {quiz.description && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed">{quiz.description}</p>
                  )}
                </div>

                {/* Stats & Footer */}
                <div className="pt-5 border-t border-gray-100 relative z-10 mt-auto">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-600 border border-gray-100">
                      <BookOpen className="w-3.5 h-3.5 text-purple-500" /> {quiz._count.questions} Qs
                    </span>
                    <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-600 border border-gray-100">
                      <Users className="w-3.5 h-3.5 text-cyan-500" /> {quiz._count.results} plays
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-medium text-gray-500">by {quiz.createdBy.fullName}</span>
                    {sched === "ended" ? (
                      <div className="relative inline-flex items-center justify-center py-2 px-4 transition-all duration-200 cursor-not-allowed opacity-60">
                        <span className="relative z-10 font-bold text-sm tracking-[0.05em] text-gray-500 uppercase">
                          CLOSED
                        </span>
                      </div>
                    ) : (
                      <Link href={`/student/quizzes/${quiz.id}`} className="relative inline-flex items-center justify-center py-2 px-4 transition-all duration-200 cursor-pointer group/btn active:scale-95">
                        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-10 h-10 bg-[#dfceff] rounded-full transition-all duration-300 ease-out group-hover/btn:w-full z-0"></div>
                        <span className="relative z-10 font-bold text-sm tracking-[0.05em] text-[#6a32db] uppercase">
                          {openQuizMap.has(quiz.id) ? "CONTINUE" : "START"}
                        </span>
                        <svg className="relative z-10 ml-2.5 w-[15px] h-[10px] -translate-x-1 transition-all duration-300 ease-out fill-none stroke-[#6a32db] stroke-2 [stroke-linecap:round] [stroke-linejoin:round] group-hover/btn:translate-x-0.5" viewBox="0 0 13 10">
                          <path d="M1,5 L11,5" />
                          <polyline points="8 1 12 5 8 9" />
                        </svg>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
