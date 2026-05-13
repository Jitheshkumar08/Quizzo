"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ArrowUpRight,
  BarChart2,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Clock,
  Sparkles,
  Trophy,
  UserRound,
} from "lucide-react";
import { formatAppDate, formatAppTime } from "@/lib/timezone";
import { MISSED_REATTEMPT_LABEL } from "@/lib/reattempt-utils";

export interface AdminAttemptItem {
  id: string;
  quizId: string;
  quizTitle: string;
  studentName: string;
  username: string;
  profileImageUrl: string | null;
  attemptType: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeTaken: number | null;
  submittedAt: string;
}

type SortField = "score" | "submitted";
type SortDirection = "asc" | "desc";

function displayQuizTitle(title: string) {
  return title.replace(new RegExp(`\\s+-\\s+${MISSED_REATTEMPT_LABEL}$`, "i"), "");
}

function renderTwoWordLines(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 2) return value;

  return (
    <>
      {words.slice(0, 2).join(" ")}
      <br />
      {words.slice(2).join(" ")}
    </>
  );
}

export default function AdminAllAttemptsTable({ attempts }: { attempts: AdminAttemptItem[] }) {
  const [sortField, setSortField] = useState<SortField>("submitted");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedAttempts = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;

    return [...attempts].sort((a, b) => {
      if (sortField === "score") {
        const scoreDiff = a.percentage - b.percentage || a.score - b.score;
        if (scoreDiff !== 0) return scoreDiff * direction;
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }

      return (new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()) * direction;
    });
  }, [attempts, sortDirection, sortField]);

  const avgScore =
    attempts.length > 0
      ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / attempts.length)
      : 0;
  const topScore = attempts.length > 0 ? Math.max(...attempts.map((attempt) => attempt.percentage)) : 0;

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection(field === "score" ? "asc" : "desc");
  }

  function renderSortIndicator(field: SortField) {
    const iconClassName = "w-4 h-4 stroke-[2.6] text-slate-400";
    const activeIconClassName = "w-4 h-4 stroke-[2.8] text-slate-600";

    if (sortField !== field) {
      return <ArrowDownWideNarrow className={iconClassName} aria-hidden="true" />;
    }

    return sortDirection === "asc" ? (
      <ArrowUpNarrowWide className={activeIconClassName} aria-hidden="true" />
    ) : (
      <ArrowDownWideNarrow className={activeIconClassName} aria-hidden="true" />
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="glass rounded-2xl border border-[#E8E2D8] px-6 py-12 text-center shadow-[0_4px_32px_rgba(0,0,0,0.06)]">
        <BarChart2 className="mx-auto mb-3 h-12 w-12 text-gray-300" />
        <p className="text-sm font-black text-[#2C2A28]">No attempts yet</p>
        <p className="mt-1 text-xs font-semibold text-[#918B80]">No quiz attempts have been submitted on the platform.</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .review-attempt-button {
          background: linear-gradient(180deg, #ffe98a 0%, #ffe06e 100%);
          color: #0f172a;
          font-family: inherit;
          padding: 0.62em 1.05em;
          font-weight: 900;
          font-size: 14px;
          border: 3px solid black;
          border-radius: 0.7em;
          box-shadow: 0.12em 0.12em black, inset 0 1px 0 rgba(255, 255, 255, 0.55);
          cursor: pointer;
          transition: transform 140ms ease, box-shadow 140ms ease, filter 140ms ease;
        }

        .review-attempt-button:hover {
          transform: translate(-0.05em, -0.05em);
          box-shadow: 0.18em 0.18em black, inset 0 1px 0 rgba(255, 255, 255, 0.65);
          filter: saturate(1.08);
        }

        .review-attempt-button:active {
          transform: translate(0.05em, 0.05em);
          box-shadow: 0.05em 0.05em black;
        }
      `}</style>

      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{attempts.length}</p>
            <p className="mt-1 text-xs font-semibold text-blue-500">Total Attempts</p>
          </div>
          <div className="rounded-2xl border border-green-100 bg-green-50 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{avgScore}%</p>
            <p className="mt-1 text-xs font-semibold text-green-500">Avg Score</p>
          </div>
          <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{topScore}%</p>
            <p className="mt-1 text-xs font-semibold text-purple-500">Top Score</p>
          </div>
        </div>

        <div className="rounded-2xl border border-black/5 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80">
                <th className="text-left px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-2">
                    <UserRound className="w-4 h-4 text-slate-400" />
                    Student
                  </span>
                </th>
                <th className="text-left px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-slate-400" />
                    Quiz
                  </span>
                </th>
                <th className="text-left px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-wider" aria-sort={sortField === "score" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                  <button
                    type="button"
                    onClick={() => toggleSort("score")}
                    className="inline-flex cursor-pointer items-center gap-2 uppercase tracking-wider transition-colors hover:text-slate-800"
                    title="Sort by score"
                  >
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Score
                    {renderSortIndicator("score")}
                  </button>
                </th>
                <th className="text-left px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">
                  <span className="inline-flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    Duration
                  </span>
                </th>
                <th className="text-left px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-wider" aria-sort={sortField === "submitted" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                  <button
                    type="button"
                    onClick={() => toggleSort("submitted")}
                    className="inline-flex cursor-pointer items-center gap-2 uppercase tracking-wider transition-colors hover:text-slate-800"
                    title="Sort by recent submitted time"
                  >
                    <CalendarDays className="w-4 h-4 text-violet-500" />
                    Submitted
                    {renderSortIndicator("submitted")}
                  </button>
                </th>
                <th className="text-right px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">
                  <span className="inline-flex items-center justify-end gap-2">
                    <Sparkles className="w-4 h-4 text-slate-400" />
                    Action
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedAttempts.map((attempt) => (
                <tr key={attempt.id} className="bg-white hover:bg-slate-50/80 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-100 to-fuchsia-100 ring-1 ring-purple-200/70 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                        {attempt.profileImageUrl ? (
                          <>
                            <span aria-hidden="true" className="absolute inset-0 bg-[#F6F1E8]" />
                            <span
                              aria-hidden="true"
                              className="relative h-full w-full bg-cover bg-center"
                              style={{ backgroundImage: `url("${attempt.profileImageUrl}")` }}
                            />
                          </>
                        ) : (
                          <span className="text-sm font-black text-purple-700">
                            {attempt.studentName?.[0]?.toUpperCase() ?? "?"}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-950 text-sm leading-tight [overflow-wrap:anywhere]">{renderTwoWordLines(attempt.studentName)}</p>
                        <p className="text-slate-400 text-xs font-semibold truncate">@{attempt.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-950 text-sm leading-tight [overflow-wrap:anywhere]">{renderTwoWordLines(displayQuizTitle(attempt.quizTitle))}</p>
                      <p className="mt-1 text-slate-400 text-xs font-black uppercase tracking-wide">
                        {attempt.attemptType === "NORMAL" ? "Normal attempt" : "Reattempt"}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-black px-3 py-1 rounded-full ${attempt.percentage >= 75
                          ? "bg-emerald-100 text-emerald-700"
                          : attempt.percentage >= 50
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                          }`}
                      >
                        {attempt.percentage}%
                      </span>
                      <span className="text-sm font-medium text-slate-500">
                        {attempt.score}/{attempt.totalQuestions}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600 whitespace-nowrap">
                      <Clock className="w-4 h-4 flex-shrink-0 text-slate-400" />
                      {Math.floor((attempt.timeTaken || 0) / 60)}m {(attempt.timeTaken || 0) % 60}s
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-sm text-slate-600 leading-snug whitespace-nowrap">
                      <span className="font-bold text-slate-900">{formatAppTime(attempt.submittedAt)}</span>
                      <span className="text-slate-300 mx-1.5">&middot;</span>
                      <span className="text-slate-500 font-medium">{formatAppDate(attempt.submittedAt)}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/student/results/${attempt.id}`}
                      prefetch={false}
                      className="review-attempt-button inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      Review
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
