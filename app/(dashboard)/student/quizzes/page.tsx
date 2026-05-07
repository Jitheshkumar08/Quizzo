import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { BookOpen, Users, Lock, CalendarRange, Timer } from "lucide-react";
import { getScheduleStatus } from "@/lib/quiz-student-access";
import TimerBadge from "@/components/quiz/TimerBadge";
import { finalizeExpiredOpenSession } from "@/lib/quiz-session";
import { formatAppScheduleDateTime } from "@/lib/timezone";
import QuizListRealtimeRefresh from "@/components/live/QuizListRealtimeRefresh";
import ScheduleBoundaryRefresh from "@/components/live/ScheduleBoundaryRefresh";
import QuizSearch from "@/components/quiz/QuizSearch";
import ScheduleStartBadge from "@/components/quiz/ScheduleStartBadge";

export const metadata = { title: "Browse Quizzes" };

interface NormalResultCountRow {
  quizId: string;
  count: bigint;
}

function formatCardDateTime(date: Date) {
  return formatAppScheduleDateTime(date);
}

function formatTimeLimit(minutes: number) {
  return `${minutes} min${minutes === 1 ? "" : "s"}`;
}

export default async function StudentQuizzesPage({ searchParams }: { searchParams?: Promise<{ q?: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");

  const resolvedSearchParams = await searchParams;
  const searchQuery = resolvedSearchParams?.q?.trim() || "";

  const whereClause: Prisma.QuizWhereInput = { isPublished: true };
  if (searchQuery) {
    whereClause.OR = [
      { title: { contains: searchQuery, mode: "insensitive" } },
      { createdBy: { username: { contains: searchQuery, mode: "insensitive" } } }
    ];
  }

  const [initialOpenSessions, quizRows, normalResultCounts] = await Promise.all([
    prisma.quizSession.findMany({
      where: { studentId: session.user.id, submittedAt: null },
      select: { quizId: true, startedAt: true }
    }),
    prisma.quiz.findMany({
      where: whereClause,
      include: {
        createdBy: { select: { username: true } },
        _count: { select: { questions: true, results: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.$queryRaw<NormalResultCountRow[]>`
      SELECT "quizId", COUNT(*) AS "count"
      FROM "Result"
      WHERE COALESCE("attemptType", 'NORMAL') = 'NORMAL'
      GROUP BY "quizId"
    `,
  ]);
  let openSessions = initialOpenSessions;
  const normalResultCountByQuiz = new Map(
    normalResultCounts.map((row) => [row.quizId, Number(row.count)])
  );

  const quizById = new Map(quizRows.map((quiz) => [quiz.id, quiz]));
  const finalizedQuizIds = new Set<string>();

  await Promise.all(
    openSessions.map(async (openSession) => {
      const quiz = quizById.get(openSession.quizId);
      if (!quiz) return;
      if (!quiz.timeLimitMinutes && !quiz.scheduledEnd) return;

      const finalized = await finalizeExpiredOpenSession({
        quizId: quiz.id,
        studentId: session.user.id,
        timeLimitMinutes: quiz.timeLimitMinutes,
        scheduledEnd: quiz.scheduledEnd,
        totalQuestions: quiz._count.questions,
      });

      if (finalized) {
        finalizedQuizIds.add(openSession.quizId);
      }
    })
  );

  if (finalizedQuizIds.size > 0) {
    openSessions = openSessions.filter((openSession) => !finalizedQuizIds.has(openSession.quizId));
  }

  const openQuizMap = new Map(openSessions.map((s) => [s.quizId, s.startedAt]));
  const quizzes = quizRows.map(({ accessPasswordHash, ...quiz }) => ({
    ...quiz,
    passwordProtected: !!accessPasswordHash,
  }));

  const now = new Date();
  const scheduleBoundaries = Array.from(
    new Set(
      quizzes.flatMap((quiz) =>
        [quiz.scheduledStart, quiz.scheduledEnd]
          .filter((date): date is Date => !!date && date > now)
          .map((date) => date.toISOString())
      )
    )
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      <QuizListRealtimeRefresh />
      <ScheduleBoundaryRefresh boundaries={scheduleBoundaries} serverNow={now.toISOString()} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text">Browse Quizzes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {searchQuery
              ? `${quizzes.length} published quiz${quizzes.length !== 1 ? "zes" : ""} matching "${searchQuery}"`
              : `${quizzes.length} published quiz${quizzes.length !== 1 ? "zes" : ""} available`}
          </p>
        </div>
        <QuizSearch initialValue={searchQuery} />
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
                className="relative overflow-hidden rounded-3xl p-5 sm:p-6 space-y-5 group flex flex-col transition-all duration-300 border border-black/5 hover:border-purple-500/30 bg-white shadow-sm hover:shadow-xl hover:shadow-purple-500/10 min-w-0"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-purple-500/10 text-purple-600 group-hover:scale-110 group-hover:bg-purple-500 group-hover:text-white transition-all duration-300 flex-shrink-0">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  {sched === "ended" ? (
                    <div className="px-3 py-1 rounded-full bg-red-50 text-xs font-bold uppercase tracking-wider text-red-600 border border-red-200 shadow-sm opacity-100">
                      Ended
                    </div>
                  ) : sched === "upcoming" && quiz.scheduledStart ? (
                    <ScheduleStartBadge scheduledStart={quiz.scheduledStart} serverNow={now} />
                  ) : openQuizMap.has(quiz.id) ? (
                    <TimerBadge
                      quizId={quiz.id}
                      startTime={openQuizMap.get(quiz.id)!}
                      timeLimitMinutes={quiz.timeLimitMinutes}
                      scheduledEnd={quiz.scheduledEnd}
                      serverNow={now}
                    />
                  ) : (
                    <div className="px-3 py-1 rounded-full bg-purple-50 text-xs font-bold uppercase tracking-wider text-purple-600 border border-purple-100 shadow-sm min-w-max">
                      Start
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 relative z-10 min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors duration-300 line-clamp-2 break-words [overflow-wrap:anywhere]">
                    {quiz.title}
                  </h3>
                  {quiz.description && (
                    <p className="text-sm text-gray-500 mt-2 line-clamp-2 leading-relaxed break-words [overflow-wrap:anywhere]">{quiz.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {quiz.passwordProtected && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-amber-50 text-amber-800 border border-amber-100">
                        <Lock className="w-3 h-3" /> Password
                      </span>
                    )}
                    {(sched === "open" || sched === "none") && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-emerald-50 text-emerald-800 border border-emerald-100">
                        Open
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
                    {quiz.timeLimitMinutes && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-purple-50 text-purple-800 border border-purple-100">
                        <Timer className="w-3 h-3" /> Time limit {formatTimeLimit(quiz.timeLimitMinutes)}
                      </span>
                    )}
                  </div>
                  {hasSchedule && (
                    <p className="mt-3 max-w-full text-[12px] font-semibold leading-relaxed text-slate-500 break-words [overflow-wrap:anywhere]">
                      <span className="font-black uppercase tracking-[0.12em] text-blue-600">Schedule</span>{" "}
                      Starts {formatCardDateTime(quiz.scheduledStart!)} | Ends {formatCardDateTime(quiz.scheduledEnd!)}
                    </p>
                  )}
                </div>

                {/* Stats & Footer */}
                <div className="pt-5 border-t border-gray-100 relative z-10 mt-auto">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-600 border border-gray-100">
                      <BookOpen className="w-3.5 h-3.5 text-purple-500" /> {quiz._count.questions} Qs
                    </span>
                    <span className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-600 border border-gray-100">
                      <Users className="w-3.5 h-3.5 text-cyan-500" /> {normalResultCountByQuiz.get(quiz.id) ?? 0} plays
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 mt-2">
                    <span className="text-xs font-medium text-gray-500 min-w-0 truncate">by @{quiz.createdBy.username}</span>
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
