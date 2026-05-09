"use client";

import { useState, useSyncExternalStore } from "react";
import { BarChart3, BookOpen, Calendar, Clock, LayoutGrid, Table2 } from "lucide-react";
import AdminQuizDeleteButton from "@/components/admin/AdminQuizDeleteButton";
import AdminQuizStatusDropdown from "@/components/admin/AdminQuizStatusDropdown";
import InstructorAnalyticsModalButton from "@/components/quiz/InstructorAnalyticsModalButton";
import PaginationControls from "@/components/ui/PaginationControls";
import { formatAppDate, formatAppTime } from "@/lib/timezone";

type ViewMode = "table" | "grid";
const PAGE_SIZE = 20;

function subscribeToViewport(callback: () => void) {
  const media = window.matchMedia("(min-width: 768px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getDesktopSnapshot() {
  return window.matchMedia("(min-width: 768px)").matches;
}

function getServerDesktopSnapshot() {
  return true;
}

export interface AdminQuizListItem {
  id: string;
  title: string;
  description: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    fullName: string;
    username: string;
  };
  questionCount: number;
  normalResultCount: number;
}

function formatDate(iso: string) {
  const date = formatAppDate(iso);
  const time = formatAppTime(iso);
  return { date, time };
}

function QuizCard({ quiz, isMod }: { quiz: AdminQuizListItem; isMod: boolean }) {
  const created = formatDate(quiz.createdAt);
  const updated = formatDate(quiz.updatedAt);

  return (
    <div className="glass rounded-[22px] border border-white/20 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-white/80 bg-violet-100">
              <BookOpen className="h-5 w-5 text-violet-600" />
            </div>
            <div className="min-w-0">
              <p className="break-words text-[15px] font-bold leading-tight text-[#1E1C1A]">{quiz.title}</p>
              {quiz.description && (
                <p className="mt-0.5 line-clamp-2 break-words text-[11px] font-semibold text-[#A09890]">
                  {quiz.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            <AdminQuizStatusDropdown quizId={quiz.id} initialPublished={quiz.isPublished} />
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-[#E0D9CF] bg-[#EDE8E0]/60 px-3 py-2.5">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-white/80 bg-white shadow-sm">
            <span className="text-[10px] font-black text-violet-600">{quiz.createdBy.fullName.charAt(0)}</span>
          </div>
          <div className="min-w-0">
            <p className="break-words text-[12px] font-bold leading-tight text-[#3D3A37]">{quiz.createdBy.fullName}</p>
            <p className="break-words text-[10px] font-semibold text-[#A09890]">@{quiz.createdBy.username}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex items-center gap-2.5 rounded-2xl border border-[#E8E2D9] bg-white/60 px-3 py-3 shadow-sm">
            <div className="rounded-xl bg-sky-50 p-1.5">
              <BookOpen className="h-4 w-4 text-sky-600" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#B0A89E]">Questions</p>
              <p className="text-base font-black leading-none text-[#1E1C1A]">{quiz.questionCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-2xl border border-[#E8E2D9] bg-white/60 px-3 py-3 shadow-sm">
            <div className="rounded-xl bg-violet-50 p-1.5">
              <BarChart3 className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#B0A89E]">Attempts</p>
              <p className="text-base font-black leading-none text-[#1E1C1A]">{quiz.normalResultCount}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          <InstructorAnalyticsModalButton quizId={quiz.id} />
          <AdminQuizDeleteButton quizId={quiz.id} quizTitle={quiz.title} disabled={isMod} />
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-[#EDE8E0] pt-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-[#C4BAB0]" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#B0A89E]">Created</p>
              <p className="text-[11px] font-bold text-[#3D3A37]">{created.date}</p>
              <p className="text-[10px] font-semibold text-[#A09890]">{created.time}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-[#C4BAB0]" />
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#B0A89E]">Updated</p>
              <p className="text-[11px] font-bold text-[#3D3A37]">{updated.date}</p>
              <p className="text-[10px] font-semibold text-[#A09890]">{updated.time}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminQuizList({
  quizzes,
  isMod,
}: {
  quizzes: AdminQuizListItem[];
  isMod: boolean;
}) {
  const isDesktop = useSyncExternalStore(
    subscribeToViewport,
    getDesktopSnapshot,
    getServerDesktopSnapshot
  );
  const [selectedViewMode, setSelectedViewMode] = useState<ViewMode | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const viewMode = selectedViewMode ?? (isDesktop ? "table" : "grid");
  const totalPages = Math.max(1, Math.ceil(quizzes.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pageStartIndex = (page - 1) * PAGE_SIZE;
  const paginatedQuizzes = quizzes.slice(pageStartIndex, pageStartIndex + PAGE_SIZE);
  const startItem = quizzes.length === 0 ? 0 : pageStartIndex + 1;
  const endItem = Math.min(pageStartIndex + paginatedQuizzes.length, quizzes.length);

  function goToPreviousPage() {
    setCurrentPage((value) => Math.max(1, Math.min(value, totalPages) - 1));
  }

  function goToNextPage() {
    setCurrentPage((value) => Math.min(totalPages, Math.min(value, totalPages) + 1));
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#A09890]">
          {quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""} matched
        </p>
        <div
          className="inline-flex h-12 items-center rounded-2xl border border-[#D8CFC3] bg-white/78 p-1 shadow-[0_10px_24px_rgba(44,42,40,0.12)]"
          aria-label="Quiz list view"
        >
          <button
            type="button"
            onClick={() => setSelectedViewMode("table")}
            className={`inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl transition-colors ${viewMode === "table"
              ? "bg-[#65432c] text-white shadow-[0_6px_16px_rgba(140,93,62,0.24)]"
              : "text-[#8C6D50] hover:bg-white/55 hover:text-[#2C2A28]"
              }`}
            aria-label="Table view"
            aria-pressed={viewMode === "table"}
            title="Table view"
          >
            <Table2 className="h-[18px] w-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => setSelectedViewMode("grid")}
            className={`inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl transition-colors ${viewMode === "grid"
              ? "bg-[#8C5D3E] text-white shadow-[0_6px_16px_rgba(140,93,62,0.24)]"
              : "text-[#8C6D50] hover:bg-white/55 hover:text-[#2C2A28]"
              }`}
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
            title="Grid view"
          >
            <LayoutGrid className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      {viewMode === "grid" && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {paginatedQuizzes.map((quiz) => (
            <QuizCard key={quiz.id} quiz={quiz} isMod={isMod} />
          ))}
        </div>
      )}

      {viewMode === "table" && (
        <div className="glass rounded-2xl border border-[#E8E2D8] shadow-[0_4px_32px_rgba(0,0,0,0.06)]">
          <div className="overflow-x-auto rounded-2xl">
            <table className="w-full min-w-[1000px] table-fixed">
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
                <tr className="border-b-2 border-[#E4DDD3] bg-[#F0EBE2]/80">
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
                {paginatedQuizzes.map((quiz, i) => {
                  const created = formatDate(quiz.createdAt);
                  const updated = formatDate(quiz.updatedAt);

                  return (
                    <tr
                      key={quiz.id}
                      className={`border-b border-[#EDE8E0] transition-colors duration-150 last:border-0 ${(pageStartIndex + i) % 2 === 0 ? "bg-white/20" : "bg-[#FAF7F3]/40"} hover:bg-[#F5EDE2]/60`}
                    >
                      <td className="px-4 py-4">
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-bold leading-snug text-[#1E1C1A]">{quiz.title}</p>
                          {quiz.description && (
                            <p className="truncate text-[11px] font-semibold text-[#A09890]">{quiz.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-bold leading-snug text-[#1E1C1A]">{quiz.createdBy.fullName}</p>
                          <p className="truncate text-[11px] font-semibold text-[#A09890]">@{quiz.createdBy.username}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <AdminQuizStatusDropdown quizId={quiz.id} initialPublished={quiz.isPublished} />
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex min-w-[36px] items-center justify-center rounded-xl border border-sky-100 bg-sky-50 px-3 py-1 text-sm font-black text-sky-700">
                          {quiz.questionCount}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex min-w-[36px] items-center justify-center rounded-xl border border-violet-100 bg-violet-50 px-3 py-1 text-sm font-black text-violet-700">
                          {quiz.normalResultCount}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] font-bold text-[#3D3A37]">{created.date}</span>
                          <span className="text-[11px] font-semibold text-[#A09890]">{created.time}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[13px] font-bold text-[#3D3A37]">{updated.date}</span>
                          <span className="text-[11px] font-semibold text-[#A09890]">{updated.time}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex justify-center">
                          <InstructorAnalyticsModalButton quizId={quiz.id} compact />
                        </div>
                      </td>
                      <td className="px-2 py-4 text-center">
                        <div className="flex justify-center">
                          <AdminQuizDeleteButton quizId={quiz.id} quizTitle={quiz.title} disabled={isMod} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-[#E4DDD3] bg-[#F0EBE2]/60 px-5 py-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#A09890]">
              {quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""} total
            </p>
            <div className="flex items-center gap-4 text-[11px] font-bold text-[#6B6357]">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-emerald-500 to-green-600" />Published
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500" />Draft
              </span>
            </div>
          </div>
        </div>
      )}

      <PaginationControls
        currentPage={page}
        endItem={endItem}
        onNext={goToNextPage}
        onPrevious={goToPreviousPage}
        startItem={startItem}
        totalItems={quizzes.length}
        totalPages={totalPages}
      />
    </div>
  );
}
