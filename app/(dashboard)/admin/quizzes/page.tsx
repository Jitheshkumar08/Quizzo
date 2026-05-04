import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BookOpen, BarChart3, Calendar, Clock } from "lucide-react";
import AdminQuizStatusDropdown from "@/components/admin/AdminQuizStatusDropdown";
import InstructorAnalyticsModalButton from "@/components/quiz/InstructorAnalyticsModalButton";

export const metadata = { title: "All Quizzes — MCQify Admin" };

function formatDate(iso: Date | string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  return { date, time };
}

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
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold gradient-text">All Quizzes</h1>
        <p className="text-muted-foreground text-sm mt-1">{quizzes.length} total quizzes on platform</p>
      </div>

      {/* ── MOBILE: Card list ─────────────────────────── */}
      <div className="md:hidden grid gap-5 pb-10">
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
                    <p className="font-black text-[#1E1C1A] text-base leading-none">{quiz._count.results}</p>
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <InstructorAnalyticsModalButton quizId={quiz.id} />
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
      <div className="hidden md:block">
        <div className="glass rounded-2xl overflow-hidden border border-[#E8E2D8] shadow-[0_4px_32px_rgba(0,0,0,0.06)]">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px]">
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
                ].map((h) => (
                  <th key={h.label} className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.12em] text-[#8C6D50]">
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
                    <td className="px-5 py-4 max-w-[220px]">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <BookOpen className="w-4 h-4 text-violet-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[14px] text-[#1E1C1A] leading-snug truncate">{quiz.title}</p>
                          {quiz.description && (
                            <p className="text-[11px] font-semibold text-[#A09890] truncate">{quiz.description}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Creator */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 border border-white/80">
                          <span className="text-[11px] font-black text-violet-600">{quiz.createdBy.fullName.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-bold text-[13px] text-[#1E1C1A] leading-snug">{quiz.createdBy.fullName}</p>
                          <p className="text-[11px] font-semibold text-[#A09890]">@{quiz.createdBy.username}</p>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <AdminQuizStatusDropdown quizId={quiz.id} initialPublished={quiz.isPublished} />
                    </td>

                    {/* Questions */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center justify-center bg-sky-50 border border-sky-100 text-sky-700 font-black text-sm rounded-xl px-3 py-1 min-w-[36px]">
                        {quiz._count.questions}
                      </span>
                    </td>

                    {/* Attempts */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center justify-center bg-violet-50 border border-violet-100 text-violet-700 font-black text-sm rounded-xl px-3 py-1 min-w-[36px]">
                        {quiz._count.results}
                      </span>
                    </td>

                    {/* Created At */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] font-bold text-[#3D3A37]">{created.date}</span>
                        <span className="text-[11px] font-semibold text-[#A09890]">{created.time}</span>
                      </div>
                    </td>

                    {/* Last Modified */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[13px] font-bold text-[#3D3A37]">{updated.date}</span>
                        <span className="text-[11px] font-semibold text-[#A09890]">{updated.time}</span>
                      </div>
                    </td>

                    {/* View Analytics */}
                    <td className="px-5 py-4">
                      <InstructorAnalyticsModalButton quizId={quiz.id} compact />
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
    </div>
  );
}
