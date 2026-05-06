import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { BookOpen, Eye, FileJson, BarChart3, Pencil, Timer } from "lucide-react";
import InstructorAnalyticsModalButton from "@/components/quiz/InstructorAnalyticsModalButton";
import { getScheduleStatus } from "@/lib/quiz-student-access";
import { formatAppDate, formatAppScheduleDateTime } from "@/lib/timezone";
import QuizListRealtimeRefresh from "@/components/live/QuizListRealtimeRefresh";

export const metadata = { title: "My Quizzes — MCQify" };

interface NormalResultCountRow {
  quizId: string;
  count: bigint;
}

function formatScheduleTime(date: Date) {
  return formatAppScheduleDateTime(date);
}

function formatTimeLimit(minutes: number) {
  return `${minutes} min${minutes === 1 ? "" : "s"}`;
}

export default async function InstructorQuizzesPage() {
  const session = await auth();
  if (!session || (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN")) {
    redirect("/dashboard");
  }

  const where = session.user.role === "ADMIN" ? {} : { createdById: session.user.id };

  type QuizRow = Awaited<ReturnType<typeof prisma.quiz.findMany<{
    include: { createdBy: { select: { fullName: true } }; _count: { select: { questions: true; results: true } } };
  }>>>[number];

  const [quizzes, normalResultCounts] = await Promise.all([
    prisma.quiz.findMany({
      where,
      include: {
        createdBy: { select: { fullName: true } },
        _count: { select: { questions: true, results: true } },
      },
      orderBy: { createdAt: "desc" },
    }) as Promise<QuizRow[]>,
    prisma.$queryRaw<NormalResultCountRow[]>`
      SELECT r."quizId", COUNT(*) AS "count"
      FROM "Result" r
      INNER JOIN "Quiz" q ON q."id" = r."quizId"
      WHERE COALESCE(r."attemptType", 'NORMAL') = 'NORMAL'
        ${session.user.role === "ADMIN" ? Prisma.empty : Prisma.sql`AND q."createdById" = ${session.user.id}`}
      GROUP BY r."quizId"
    `,
  ]);
  const normalResultCountByQuiz = new Map(
    normalResultCounts.map((row) => [row.quizId, Number(row.count)])
  );

  return (
    <div className="space-y-6 animate-fade-in-up pb-10">
      <QuizListRealtimeRefresh />
      <style>{`
      .eq-action-btn-outline {
        font-family: inherit;
        padding: 0.5em 1.1em;
        font-weight: 900;
        font-size: 14px;
        border: 3px solid currentColor;
        border-radius: 0.4em;
        box-shadow: 0.1em 0.1em currentColor;
        cursor: pointer;
        transition: transform 120ms ease, box-shadow 120ms ease;
      }
      .eq-action-btn-outline:hover {
        transform: translate(-0.05em, -0.05em);
        box-shadow: 0.15em 0.15em currentColor;
      }
      .eq-action-btn-outline:active {
        transform: translate(0.05em, 0.05em);
        box-shadow: 0.05em 0.05em currentColor;
      }
      `}</style>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
        <div className="grid gap-6 pb-10">
          {quizzes.map((quiz) => {
            const hasSchedule = !!(quiz.scheduledStart && quiz.scheduledEnd);
            const scheduleStatus = hasSchedule
              ? getScheduleStatus(new Date(), quiz.scheduledStart, quiz.scheduledEnd)
              : quiz.isPublished
                ? "open"
                : "ended";

            return (
            <div key={quiz.id} className="glass glass-hover rounded-[24px] p-5 sm:p-6 flex flex-col lg:flex-row items-stretch lg:items-center gap-5 lg:gap-6 border border-white/10 shadow-sm hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 overflow-hidden">
              <div className="flex items-start gap-4 flex-1 min-w-0 max-w-full">
                {/* Icon */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center flex-shrink-0 border border-purple-500/10">
                  <BookOpen className="w-6 h-6 sm:w-7 sm:h-7 text-purple-500" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 max-w-full space-y-2">
                  <h3 className="font-bold text-base sm:text-lg text-[#2C2A28] leading-tight min-w-0 max-w-full break-words [overflow-wrap:anywhere]">{quiz.title}</h3>
                  {quiz.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed break-words [overflow-wrap:anywhere]">{quiz.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider mt-0.5 ${quiz.isPublished
                        ? "text-green-500 bg-green-500/10 border-green-500/20"
                        : "text-amber-500 bg-amber-500/10 border-amber-500/20"
                      }`}>
                      {quiz.isPublished ? "Published" : "Draft"}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-wider mt-0.5 ${
                      scheduleStatus === "upcoming"
                        ? "text-blue-700 bg-blue-50 border-blue-100"
                        : scheduleStatus === "open"
                          ? "text-emerald-700 bg-emerald-50 border-emerald-100"
                          : "text-gray-600 bg-gray-100 border-gray-200"
                    }`}>
                      {scheduleStatus === "upcoming" ? "Upcoming" : scheduleStatus === "open" ? "Open" : "Closed"}
                    </span>
                    {quiz.timeLimitMinutes && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-100 bg-purple-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-800">
                        <Timer className="h-3 w-3 flex-shrink-0" />
                        Time limit {formatTimeLimit(quiz.timeLimitMinutes)}
                      </span>
                    )}
                  </div>
                  {hasSchedule && (
                    <p className="max-w-full text-[12px] font-semibold leading-relaxed text-slate-500 break-words [overflow-wrap:anywhere]">
                      <span className="font-black uppercase tracking-[0.12em] text-blue-600">Schedule</span>{" "}
                      Starts {formatScheduleTime(quiz.scheduledStart!)} | Ends {formatScheduleTime(quiz.scheduledEnd!)}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-xs font-medium text-muted-foreground">
                    <span className="flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5 text-blue-400" /> {quiz._count.questions} Questions</span>
                    <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-cyan-400" /> {normalResultCountByQuiz.get(quiz.id) ?? 0} Attempts</span>
                    {session.user.role === "ADMIN" && (
                      <span className="bg-black/5 px-2 py-0.5 rounded-md">by {quiz.createdBy.fullName}</span>
                    )}
                    <span className="opacity-70">{formatAppDate(quiz.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-end gap-3 self-end lg:self-center lg:ml-0 shrink-0">
                {quiz.jsonBlobUrl && (
                  <a
                    href={quiz.jsonBlobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl text-muted-foreground hover:text-cyan-600 hover:bg-cyan-50 border border-transparent hover:border-cyan-100 transition-all"
                    title="Download JSON"
                  >
                    <FileJson className="w-5 h-5" />
                  </a>
                )}

                <InstructorAnalyticsModalButton quizId={quiz.id} />

                <Link
                  href={`/instructor/quizzes/${quiz.id}/edit`}
                  className="eq-action-btn-outline flex items-center justify-center h-[42px] gap-2 text-purple-600 bg-purple-50 hover:bg-purple-100"
                >
                  <Pencil className="w-4 h-4" /> Edit
                </Link>
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}
