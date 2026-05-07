import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { BookOpen, BarChart3, Calendar, Clock } from "lucide-react";
import AdminQuizStatusDropdown from "@/components/admin/AdminQuizStatusDropdown";
import InstructorAnalyticsModalButton from "@/components/quiz/InstructorAnalyticsModalButton";
import AdminQuizUsernameSearch from "@/components/admin/AdminQuizUsernameSearch";
import { formatAppDate, formatAppTime } from "@/lib/timezone";
import AdminQuizDeleteButton from "@/components/admin/AdminQuizDeleteButton";
import QuizListRealtimeRefresh from "@/components/live/QuizListRealtimeRefresh";

export const metadata = { title: "All Quizzes — Quizzo Admin" };

interface AdminQuizzesPageProps {
  searchParams?: Promise<{ username?: string }>;
}

interface NormalResultCountRow {
  quizId: string;
  count: bigint;
}

function formatDate(iso: Date | string) {
  const date = formatAppDate(iso);
  const time = formatAppTime(iso);
  return { date, time };
}

export default async function AdminQuizzesPage({ searchParams }: AdminQuizzesPageProps) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");
  const params = searchParams ? await searchParams : {};
  const usernameQuery = typeof params.username === "string" ? params.username.trim() : "";
  const where: Prisma.QuizWhereInput = usernameQuery
    ? {
        createdBy: {
          username: {
            contains: usernameQuery,
            mode: "insensitive",
          },
        },
      }
    : {};

  type QuizRow = Awaited<ReturnType<typeof prisma.quiz.findMany<{
    include: { createdBy: { select: { fullName: true; username: true } }; _count: { select: { questions: true; results: true } } };
  }>>>[number];

  const quizzes: QuizRow[] = await prisma.quiz.findMany({
    where,
    include: {
      createdBy: { select: { fullName: true, username: true } },
      _count: { select: { questions: true, results: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const normalResultCounts = await prisma.$queryRaw<NormalResultCountRow[]>`
    SELECT "quizId", COUNT(*) AS "count"
    FROM "Result"
    WHERE COALESCE("attemptType", 'NORMAL') = 'NORMAL'
    GROUP BY "quizId"
  `;
  const normalResultCountByQuiz = new Map(
    normalResultCounts.map((row) => [row.quizId, Number(row.count)])
  );

  return (
    <div className="space-y-6 animate-fade-in-up">
      <QuizListRealtimeRefresh />
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">All Quizzes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {usernameQuery
              ? `${quizzes.length} quiz${quizzes.length !== 1 ? "zes" : ""} matching @${usernameQuery}`
              : `${quizzes.length} total quizzes on platform`}
          </p>
        </div>

        <AdminQuizUsernameSearch initialValue={usernameQuery} />
      </div>

      {quizzes.length === 0 ? (
        <div className="glass rounded-2xl border border-[#E8E2D8] px-6 py-12 text-center shadow-[0_4px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-black text-[#2C2A28]">No quizzes found</p>
          <p className="mt-1 text-xs font-semibold text-[#918B80]">
            {usernameQuery
              ? `No creator username matches @${usernameQuery}`
              : "No quizzes are on the platform yet."}
          </p>
        </div>
      ) : (
      <>
      {/* ── MOBILE: Card list ─────────────────────────── */}
      <div className="xl:hidden grid gap-5 pb-10">
        {quizzes.map((quiz) => {
          const created = formatDate(quiz.createdAt);
          const updated = formatDate(quiz.updatedAt);
          return (
            <div key={quiz.id} className="glass rounded-[22px] p-5 space-y-4 border border-white/20 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
              {/* Top */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0 border border-white/80">
                    <BookOpen className="w-5 h-5 text-violet-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-[15px] text-[#1E1C1A] leading-tight break-words">{quiz.title}</p>
                    {quiz.description && (
                      <p className="text-[11px] font-semibold text-[#A09890] mt-0.5 truncate">{quiz.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <AdminQuizStatusDropdown quizId={quiz.id} initialPublished={quiz.isPublished} />
                </div>
              </div>

              {/* Creator */}
              <div className="flex items-center gap-2 bg-[#EDE8E0]/60 rounded-xl px-3 py-2.5 border border-[#E0D9CF]">
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm border border-white/80">
                  <span className="text-[10px] font-black text-violet-600">{quiz.createdBy.fullName.charAt(0)}</span>
                </div>
                <div>
                  <span className="text-[12px] font-bold text-[#3D3A37]">{quiz.createdBy.fullName}</span>
                  <span className="text-[10px] font-semibold text-[#A09890] ml-1.5">@{quiz.createdBy.username}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-white/60 rounded-2xl px-3 py-3 border border-[#E8E2D9] shadow-sm flex items-center gap-2.5">
                  <div className="p-1.5 rounded-xl bg-sky-50"><BookOpen className="w-4 h-4 text-sky-600" /></div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-[#B0A89E] tracking-widest">Questions</p>
                    <p className="font-black text-[#1E1C1A] text-base leading-none">{quiz._count.questions}</p>
                  </div>
                </div>
                <div className="bg-white/60 rounded-2xl px-3 py-3 border border-[#E8E2D9] shadow-sm flex items-center gap-2.5">
                  <div className="p-1.5 rounded-xl bg-violet-50"><BarChart3 className="w-4 h-4 text-violet-600" /></div>
                  <div>
                    <p className="text-[9px] font-black uppercase text-[#B0A89E] tracking-widest">Attempts</p>
                    <p className="font-black text-[#1E1C1A] text-base leading-none">{normalResultCountByQuiz.get(quiz.id) ?? 0}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <InstructorAnalyticsModalButton quizId={quiz.id} />
                <AdminQuizDeleteButton quizId={quiz.id} quizTitle={quiz.title} />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#EDE8E0]">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3 text-[#C4BAB0]" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-[#B0A89E] tracking-widest">Created</p>
                    <p className="text-[11px] font-bold text-[#3D3A37]">{created.date}</p>
                    <p className="text-[10px] font-semibold text-[#A09890]">{created.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-[#C4BAB0]" />
                  <div>
                    <p className="text-[9px] font-black uppercase text-[#B0A89E] tracking-widest">Updated</p>
                    <p className="text-[11px] font-bold text-[#3D3A37]">{updated.date}</p>
                    <p className="text-[10px] font-semibold text-[#A09890]">{updated.time}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── DESKTOP: Premium Table ─────────────────────── */}
      <div className="hidden xl:block">
        <div className="glass rounded-2xl overflow-hidden border border-[#E8E2D8] shadow-[0_4px_32px_rgba(0,0,0,0.06)]">
          <div className="overflow-hidden">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[15%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[9%]" />
              <col className="w-[8%]" />
              <col className="w-[11%]" />
              <col className="w-[11%]" />
              <col className="w-[14%]" />
              <col className="w-[6%]" />
            </colgroup>
            <thead>
              <tr className="bg-[#F0EBE2]/80 border-b-2 border-[#E4DDD3]">
                {[
                  { label: "Title" },
                  { label: "Creator" },
                  { label: "Status" },
                  { label: "Questions" },
                  { label: "Attempts" },
                  { label: "Created At" },
                  { label: "Last Modified" },
                  { label: "View Analytics" },
                  { label: "Delete" },
                ].map((h) => (
                  <th key={h.label} className={`py-4 text-left text-[10px] font-black uppercase tracking-[0.12em] text-[#8C6D50] ${h.label === "Delete" ? "px-2 text-center" : h.label === "View Analytics" ? "px-4 text-center" : "px-4"}`}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quizzes.map((quiz, i) => {
                const created = formatDate(quiz.createdAt);
                const updated = formatDate(quiz.updatedAt);
                return (
                  <tr
                    key={quiz.id}
                    className={`
                      transition-colors duration-150 border-b border-[#EDE8E0] last:border-0
                      ${i % 2 === 0 ? "bg-white/20" : "bg-[#FAF7F3]/40"}
                      hover:bg-[#F5EDE2]/60
                    `}
                  >
                    {/* Title */}
                    <td className="px-4 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold leading-snug text-[#1E1C1A]">{quiz.title}</p>
                        {quiz.description && (
                          <p className="truncate text-[11px] font-semibold text-[#A09890]">{quiz.description}</p>
                        )}
                      </div>
                    </td>

                    {/* Creator */}
                    <td className="px-4 py-4">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold leading-snug text-[#1E1C1A]">{quiz.createdBy.fullName}</p>
                        <p className="truncate text-[11px] font-semibold text-[#A09890]">@{quiz.createdBy.username}</p>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <AdminQuizStatusDropdown quizId={quiz.id} initialPublished={quiz.isPublished} />
                    </td>

                    {/* Questions */}
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center justify-center bg-sky-50 border border-sky-100 text-sky-700 font-black text-sm rounded-xl px-3 py-1 min-w-[36px]">
                        {quiz._count.questions}
                      </span>
                    </td>

                    {/* Attempts */}
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center justify-center bg-violet-50 border border-violet-100 text-violet-700 font-black text-sm rounded-xl px-3 py-1 min-w-[36px]">
                        {normalResultCountByQuiz.get(quiz.id) ?? 0}
                      </span>
                    </td>

                    {/* Created At */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] font-bold text-[#3D3A37]">{created.date}</span>
                        <span className="text-[11px] font-semibold text-[#A09890]">{created.time}</span>
                      </div>
                    </td>

                    {/* Last Modified */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] font-bold text-[#3D3A37]">{updated.date}</span>
                        <span className="text-[11px] font-semibold text-[#A09890]">{updated.time}</span>
                      </div>
                    </td>

                    {/* View Analytics */}
                    <td className="px-4 py-4 text-center">
                      <div className="flex justify-center">
                        <InstructorAnalyticsModalButton quizId={quiz.id} compact />
                      </div>
                    </td>

                    {/* Delete */}
                    <td className="px-2 py-4 text-center">
                      <div className="flex justify-center">
                        <AdminQuizDeleteButton quizId={quiz.id} quizTitle={quiz.title} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 bg-[#F0EBE2]/60 border-t border-[#E4DDD3] flex items-center justify-between">
            <p className="text-[11px] font-bold text-[#A09890] uppercase tracking-widest">
              {quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""} total
            </p>
            <div className="flex items-center gap-4 text-[11px] font-bold text-[#6B6357]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-emerald-500 to-green-600" />Published
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500" />Draft
              </span>
            </div>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
