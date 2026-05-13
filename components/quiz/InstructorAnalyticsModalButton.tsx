"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ArrowUpRight, BarChart2, CalendarDays, ClipboardCheck, Clock, Sparkles, Trophy, UserRound, X } from "lucide-react";
import { formatAppDate, formatAppTime } from "@/lib/timezone";

interface AnalyticsResult {
    id: string;
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

export default function InstructorAnalyticsModalButton({
    quizId,
    compact = false,
}: {
    quizId: string;
    compact?: boolean;
}) {
    const [analyticsOpen, setAnalyticsOpen] = useState(false);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsResult[]>([]);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsError, setAnalyticsError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [sortField, setSortField] = useState<SortField>("submitted");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [showReattempts, setShowReattempts] = useState(false);

    const visibleAnalyticsData = useMemo(() => {
        return showReattempts ? analyticsData : analyticsData.filter((result) => result.attemptType === "NORMAL");
    }, [analyticsData, showReattempts]);

    const reattemptCount = useMemo(() => {
        return analyticsData.filter((result) => result.attemptType !== "NORMAL").length;
    }, [analyticsData]);

    const sortedAnalyticsData = useMemo(() => {
        const direction = sortDirection === "asc" ? 1 : -1;
        return [...visibleAnalyticsData].sort((a, b) => {
            if (sortField === "score") {
                const scoreDiff = a.percentage - b.percentage || a.score - b.score;
                if (scoreDiff !== 0) return scoreDiff * direction;
                return (new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()) * -1;
            }

            return (new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()) * direction;
        });
    }, [sortDirection, sortField, visibleAnalyticsData]);

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

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setMounted(true);
        }, 0);

        return () => window.clearTimeout(timer);
    }, []);

    async function handleViewAnalytics(e?: MouseEvent) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        setAnalyticsOpen(true);
        setAnalyticsLoading(true);
        setAnalyticsError(null);
        setAnalyticsData([]);
        try {
            const res = await fetch(`/api/quiz/${encodeURIComponent(quizId)}/analytics`, {
                credentials: "include",
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                setAnalyticsError(
                    typeof data.error === "string" ? data.error : `Could not load analytics (${res.status})`
                );
                setAnalyticsData([]);
                return;
            }
            setAnalyticsData(Array.isArray(data.results) ? data.results : []);
        } catch {
            setAnalyticsError("Network error while loading analytics");
            setAnalyticsData([]);
        } finally {
            setAnalyticsLoading(false);
        }
    }

    return (
        <>
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
                    0% {
                        background-position: 120% 0;
                    }

                    100% {
                        background-position: -120% 0;
                    }
                }
            `}</style>
            <button
                onClick={handleViewAnalytics}
                className={`eq-action-btn-outline flex items-center justify-center gap-2 text-blue-600 bg-blue-50 hover:bg-blue-100 ${compact ? "h-[34px] text-[12px] px-2.5 py-1" : "h-[42px]"}`}
            >
                <BarChart2 className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
                <span className="whitespace-nowrap">{compact ? "Analytics" : "View Analytics"}</span>
            </button>

            {mounted && analyticsOpen &&
                createPortal(
                    <div
                        className="fixed inset-0 z-[9999] overflow-y-auto"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="analytics-modal-title"
                    >
                        <div
                            className="min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm"
                            onClick={() => {
                                setAnalyticsOpen(false);
                                setAnalyticsError(null);
                            }}
                        >
                            <div
                                className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[min(85vh,100dvh-2rem)] flex flex-col border border-black/5 my-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Modal header */}
                                <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                            <BarChart2 className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h2 id="analytics-modal-title" className="text-lg font-bold text-gray-900">
                                                Quiz Analytics
                                            </h2>
                                            <p className="text-sm text-gray-500">
                                                {visibleAnalyticsData.length} attempt{visibleAnalyticsData.length !== 1 ? "s" : ""}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAnalyticsOpen(false);
                                            setAnalyticsError(null);
                                        }}
                                        className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-gray-500 cursor-pointer"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Modal body */}
                                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                                    {analyticsLoading ? (
                                        <AnalyticsSkeleton />
                                    ) : analyticsError ? (
                                        <div className="text-center py-16 px-4">
                                            <p className="text-red-600 font-medium text-sm">{analyticsError}</p>
                                            <p className="text-gray-400 text-xs mt-2">
                                                Check that you own this quiz and are signed in as an instructor.
                                            </p>
                                        </div>
                                    ) : analyticsData.length === 0 ? (
                                        <div className="text-center py-16">
                                            <BarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500 font-medium">No attempts yet</p>
                                            <p className="text-sm text-gray-400 mt-1">Students haven&apos;t taken this quiz yet.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {reattemptCount > 0 && (
                                                <div className="flex justify-end mb-4">
                                                    <button
                                                        type="button"
                                                        role="switch"
                                                        aria-checked={showReattempts}
                                                        onClick={() => setShowReattempts((value) => !value)}
                                                        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black transition-all ${showReattempts
                                                            ? "border-blue-200 bg-blue-50 text-blue-700 shadow-sm"
                                                            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                                            }`}
                                                        title={showReattempts ? "Hide reattempt data" : "Show reattempt data"}
                                                    >
                                                        <span>Reattempts</span>
                                                        <span
                                                            className={`relative h-5 w-9 rounded-full transition-colors ${showReattempts ? "bg-blue-600" : "bg-slate-200"
                                                                }`}
                                                            aria-hidden="true"
                                                        >
                                                            <span
                                                                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${showReattempts ? "translate-x-4" : "translate-x-0.5"
                                                                    }`}
                                                            />
                                                        </span>
                                                    </button>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-3 gap-3 mb-6">
                                                <div className="bg-blue-50 rounded-2xl p-4 text-center border border-blue-100">
                                                    <p className="text-2xl font-bold text-blue-600">{visibleAnalyticsData.length}</p>
                                                    <p className="text-xs text-blue-500 font-semibold mt-1">Total Attempts</p>
                                                </div>
                                                <div className="bg-green-50 rounded-2xl p-4 text-center border border-green-100">
                                                    <p className="text-2xl font-bold text-green-600">
                                                        {visibleAnalyticsData.length > 0
                                                            ? Math.round(
                                                                visibleAnalyticsData.reduce((s, r) => s + r.percentage, 0) / visibleAnalyticsData.length
                                                            )
                                                            : 0}
                                                        %
                                                    </p>
                                                    <p className="text-xs text-green-500 font-semibold mt-1">Avg Score</p>
                                                </div>
                                                <div className="bg-purple-50 rounded-2xl p-4 text-center border border-purple-100">
                                                    <p className="text-2xl font-bold text-purple-600">
                                                        {visibleAnalyticsData.length > 0 ? Math.max(...visibleAnalyticsData.map((r) => r.percentage)) : 0}%
                                                    </p>
                                                    <p className="text-xs text-purple-500 font-semibold mt-1">Top Score</p>
                                                </div>
                                            </div>

                                            {visibleAnalyticsData.length === 0 ? (
                                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-10 text-center">
                                                    <p className="text-sm font-bold text-slate-500">No normal attempts to show</p>
                                                    <p className="mt-1 text-xs font-medium text-slate-400">Enable reattempts to include reattempt data.</p>
                                                </div>
                                            ) : (
                                                <div className="rounded-2xl border border-black/5 overflow-x-auto">
                                                <table className="w-full min-w-[780px] text-sm">
                                                    <thead>
                                                        <tr className="bg-slate-50/90 border-b border-slate-200/80">
                                                            <th className="text-left px-5 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">
                                                                <span className="inline-flex items-center gap-2">
                                                                    <UserRound className="w-4 h-4 text-slate-400" />
                                                                    Student
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
                                                        {sortedAnalyticsData.map((r) => (
                                                            <tr key={r.id} className="bg-white hover:bg-slate-50/80 transition-colors">
                                                                <td className="px-5 py-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-100 to-fuchsia-100 ring-1 ring-purple-200/70 flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden">
                                                                            {r.profileImageUrl ? (
                                                                                <>
                                                                                    <span aria-hidden="true" className="absolute inset-0 bg-[#F6F1E8]" />
                                                                                    <span
                                                                                        aria-hidden="true"
                                                                                        className="relative h-full w-full bg-cover bg-center"
                                                                                        style={{ backgroundImage: `url("${r.profileImageUrl}")` }}
                                                                                    />
                                                                                </>
                                                                            ) : (
                                                                                <span className="text-sm font-black text-purple-700">
                                                                                    {r.studentName?.[0]?.toUpperCase() ?? "?"}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <p className="font-bold text-slate-950 text-sm leading-tight [overflow-wrap:anywhere]">{renderTwoWordLines(r.studentName)}</p>
                                                                            <p className="text-slate-400 text-xs font-semibold truncate">@{r.username}</p>
                                                                            <p className="mt-0.5 text-slate-400 text-[11px] font-black uppercase tracking-wide">
                                                                                {r.attemptType === "NORMAL" ? "Normal attempt" : "Reattempt"}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-5 py-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <span
                                                                            className={`text-sm font-black px-3 py-1 rounded-full ${r.percentage >= 75
                                                                                ? "bg-emerald-100 text-emerald-700"
                                                                                : r.percentage >= 50
                                                                                    ? "bg-amber-100 text-amber-700"
                                                                                    : "bg-rose-100 text-rose-700"
                                                                                }`}
                                                                        >
                                                                            {r.percentage}%
                                                                        </span>
                                                                        <span className="text-sm font-medium text-slate-500">
                                                                            {r.score}/{r.totalQuestions}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-5 py-4">
                                                                    <span className="flex items-center gap-1.5 text-sm font-medium text-slate-600 whitespace-nowrap">
                                                                        <Clock className="w-4 h-4 flex-shrink-0 text-slate-400" />
                                                                        {Math.floor((r.timeTaken || 0) / 60)}m {(r.timeTaken || 0) % 60}s
                                                                    </span>
                                                                </td>
                                                                <td className="px-5 py-4">
                                                                    <div className="text-sm text-slate-600 leading-snug whitespace-nowrap">
                                                                        <span className="font-bold text-slate-900">
                                                                            {formatAppTime(r.submittedAt)}
                                                                        </span>
                                                                        <span className="text-slate-300 mx-1.5">·</span>
                                                                        <span className="text-slate-500 font-medium">
                                                                            {formatAppDate(r.submittedAt)}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-5 py-4 text-right">
                                                                    <Link
                                                                        href={`/student/results/${r.id}`}
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
                                            )}
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
        <div className="space-y-6" aria-label="Loading quiz analytics">
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
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="analytics-skeleton h-10 w-10 rounded-2xl flex-shrink-0" />
                            <div className="space-y-2 flex-1">
                                <div className="analytics-skeleton h-4 w-28 rounded-full" />
                                <div className="analytics-skeleton h-3 w-20 rounded-full" />
                            </div>
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
