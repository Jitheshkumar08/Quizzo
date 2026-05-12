"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
  X,
} from "lucide-react";
import { formatAppDate, formatAppTime } from "@/lib/timezone";

interface UserAttemptResult {
  id: string;
  quizId: string;
  quizTitle: string;
  attemptType: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeTaken: number | null;
  submittedAt: string;
}

type SortField = "score" | "submitted";
type SortDirection = "asc" | "desc";

export default function UserAttemptsModalButton({
  userId,
  fullName,
  username,
  count,
  compact = false,
}: {
  userId: string;
  fullName: string;
  username: string;
  count: number;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<UserAttemptResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [sortField, setSortField] = useState<SortField>("submitted");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const sortedResults = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;
    return [...results].sort((a, b) => {
      if (sortField === "score") {
        const scoreDiff = a.percentage - b.percentage || a.score - b.score;
        if (scoreDiff !== 0) return scoreDiff * direction;
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      }

      return (new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()) * direction;
    });
  }, [results, sortDirection, sortField]);

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

  async function handleOpen(e?: MouseEvent) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    setOpen(true);
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/attempts`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : `Could not load attempts (${res.status})`);
        return;
      }

      setResults(Array.isArray(data.results) ? data.results : []);
    } catch {
      setError("Network error while loading attempts");
    } finally {
      setLoading(false);
    }
  }

  const avgScore =
    results.length > 0
      ? Math.round(results.reduce((sum, result) => sum + result.percentage, 0) / results.length)
      : 0;
  const topScore = results.length > 0 ? Math.max(...results.map((result) => result.percentage)) : 0;

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

        .analytics-skeleton {
          position: relative;
          overflow: hidden;
          background: linear-gradient(90deg, #f1f5f9 0%, #ffffff 45%, #f1f5f9 100%);
          background-size: 220% 100%;
          animation: analytics-skeleton-shimmer 1.35s ease-in-out infinite;
        }

        @keyframes analytics-skeleton-shimmer {
          0% { background-position: 120% 0; }
          100% { background-position: -120% 0; }
        }
      `}</style>

      <button
        type="button"
        onClick={handleOpen}
        className={`inline-flex cursor-pointer items-center justify-center bg-violet-50 border border-violet-100 text-violet-700 font-black rounded-lg transition-all hover:-translate-y-0.5 hover:bg-violet-100 hover:shadow-sm active:translate-y-0 ${compact ? "text-[11px] px-2 py-0.5 min-w-[28px]" : "text-base px-2 py-0.5 min-w-[2rem]"}`}
        aria-label={`View ${count} attempt${count === 1 ? "" : "s"} by ${fullName}`}
        title={`View attempts by ${fullName}`}
      >
        {count}
      </button>

      {mounted && open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-attempts-modal-title"
          >
            <div
              className="min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
            >
              <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[min(85vh,100dvh-2rem)] flex flex-col border border-black/5 my-auto"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <BarChart2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 id="user-attempts-modal-title" className="text-lg font-bold text-gray-900">
                        User Attempts
                      </h2>
                      <p className="text-sm text-gray-500">
                        {fullName} @{username} · {results.length} attempt{results.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setError(null);
                    }}
                    className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-gray-500 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                  {loading ? (
                    <AnalyticsSkeleton />
                  ) : error ? (
                    <div className="text-center py-16 px-4">
                      <p className="text-red-600 font-medium text-sm">{error}</p>
                      <p className="text-gray-400 text-xs mt-2">
                        Check that you are signed in with user management access.
                      </p>
                    </div>
                  ) : results.length === 0 ? (
                    <div className="text-center py-16">
                      <BarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No attempts yet</p>
                      <p className="text-sm text-gray-400 mt-1">{fullName} has not submitted any quiz attempts.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="bg-blue-50 rounded-2xl p-4 text-center border border-blue-100">
                          <p className="text-2xl font-bold text-blue-600">{results.length}</p>
                          <p className="text-xs text-blue-500 font-semibold mt-1">Total Attempts</p>
                        </div>
                        <div className="bg-green-50 rounded-2xl p-4 text-center border border-green-100">
                          <p className="text-2xl font-bold text-green-600">{avgScore}%</p>
                          <p className="text-xs text-green-500 font-semibold mt-1">Avg Score</p>
                        </div>
                        <div className="bg-purple-50 rounded-2xl p-4 text-center border border-purple-100">
                          <p className="text-2xl font-bold text-purple-600">{topScore}%</p>
                          <p className="text-xs text-purple-500 font-semibold mt-1">Top Score</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-black/5 overflow-x-auto">
                        <table className="w-full min-w-[780px] text-sm">
                          <thead>
                            <tr className="bg-slate-50/90 border-b border-slate-200/80">
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
                                  title="Sort by submitted time"
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
                            {sortedResults.map((result) => (
                              <tr key={result.id} className="bg-white hover:bg-slate-50/80 transition-colors">
                                <td className="px-5 py-4">
                                  <div className="min-w-0">
                                    <p className="font-bold text-slate-950 text-sm truncate">{result.quizTitle}</p>
                                    <p className="mt-1 text-slate-400 text-xs font-semibold uppercase tracking-wide">
                                      {result.attemptType === "NORMAL" ? "Normal attempt" : "Reattempt"}
                                    </p>
                                  </div>
                                </td>
                                <td className="px-5 py-4">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-sm font-black px-3 py-1 rounded-full ${result.percentage >= 75
                                        ? "bg-emerald-100 text-emerald-700"
                                        : result.percentage >= 50
                                          ? "bg-amber-100 text-amber-700"
                                          : "bg-rose-100 text-rose-700"
                                        }`}
                                    >
                                      {result.percentage}%
                                    </span>
                                    <span className="text-sm font-medium text-slate-500">
                                      {result.score}/{result.totalQuestions}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-5 py-4">
                                  <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600 whitespace-nowrap">
                                    <Clock className="w-4 h-4 flex-shrink-0 text-slate-400" />
                                    {Math.floor((result.timeTaken || 0) / 60)}m {(result.timeTaken || 0) % 60}s
                                  </span>
                                </td>
                                <td className="px-5 py-4">
                                  <div className="text-sm text-slate-600 leading-snug whitespace-nowrap">
                                    <span className="font-bold text-slate-900">
                                      {formatAppTime(result.submittedAt)}
                                    </span>
                                    <span className="text-slate-300 mx-1.5">·</span>
                                    <span className="text-slate-500 font-medium">
                                      {formatAppDate(result.submittedAt)}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-5 py-4 text-right">
                                  <Link
                                    href={`/student/results/${result.id}`}
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
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading user attempts">
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-center">
            <div className="analytics-skeleton mx-auto h-7 w-12 rounded-full" />
            <div className="analytics-skeleton mx-auto mt-3 h-3 w-24 rounded-full" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-[1.4fr_0.7fr_0.8fr_1.1fr_0.8fr] gap-4 bg-slate-50/90 px-5 py-4 border-b border-slate-200">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} className="analytics-skeleton h-4 rounded-full" />
          ))}
        </div>

        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className="grid grid-cols-[1.4fr_0.7fr_0.8fr_1.1fr_0.8fr] gap-4 items-center px-5 py-4 border-b border-slate-100 last:border-b-0 bg-white"
          >
            <div className="space-y-2">
              <div className="analytics-skeleton h-4 w-36 rounded-full" />
              <div className="analytics-skeleton h-3 w-24 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <div className="analytics-skeleton h-7 w-14 rounded-full" />
              <div className="analytics-skeleton h-4 w-10 rounded-full" />
            </div>
            <div className="analytics-skeleton h-4 w-16 rounded-full" />
            <div className="analytics-skeleton h-4 w-32 rounded-full" />
            <div className="analytics-skeleton ml-auto h-11 w-28 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
