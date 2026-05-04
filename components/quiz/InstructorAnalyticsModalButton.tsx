"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Loader2, BarChart2, X, Clock } from "lucide-react";

export default function InstructorAnalyticsModalButton({ quizId }: { quizId: string }) {
    const [analyticsOpen, setAnalyticsOpen] = useState(false);
    const [analyticsData, setAnalyticsData] = useState<any[]>([]);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [analyticsError, setAnalyticsError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    async function handleViewAnalytics(e?: React.MouseEvent) {
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
            <button
                onClick={handleViewAnalytics}
                className="eq-action-btn-outline flex items-center justify-center h-[42px] gap-2 text-blue-600 bg-blue-50 hover:bg-blue-100"
            >
                <BarChart2 className="w-4 h-4" /> View Analytics
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
                                className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[min(85vh,100dvh-2rem)] flex flex-col border border-black/5 my-auto"
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
                                                {analyticsData.length} attempt{analyticsData.length !== 1 ? "s" : ""}
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
                                        <div className="flex items-center justify-center py-16">
                                            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                        </div>
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
                                            <div className="grid grid-cols-3 gap-3 mb-6">
                                                <div className="bg-blue-50 rounded-2xl p-4 text-center border border-blue-100">
                                                    <p className="text-2xl font-bold text-blue-600">{analyticsData.length}</p>
                                                    <p className="text-xs text-blue-500 font-semibold mt-1">Total Attempts</p>
                                                </div>
                                                <div className="bg-green-50 rounded-2xl p-4 text-center border border-green-100">
                                                    <p className="text-2xl font-bold text-green-600">
                                                        {analyticsData.length > 0
                                                            ? Math.round(
                                                                analyticsData.reduce((s, r) => s + r.percentage, 0) / analyticsData.length
                                                            )
                                                            : 0}
                                                        %
                                                    </p>
                                                    <p className="text-xs text-green-500 font-semibold mt-1">Avg Score</p>
                                                </div>
                                                <div className="bg-purple-50 rounded-2xl p-4 text-center border border-purple-100">
                                                    <p className="text-2xl font-bold text-purple-600">
                                                        {analyticsData.length > 0 ? Math.max(...analyticsData.map((r) => r.percentage)) : 0}%
                                                    </p>
                                                    <p className="text-xs text-purple-500 font-semibold mt-1">Top Score</p>
                                                </div>
                                            </div>

                                            <div className="rounded-2xl border border-black/5 overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-gray-50 border-b border-gray-100">
                                                            <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                                Student
                                                            </th>
                                                            <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                                Score
                                                            </th>
                                                            <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                                Duration
                                                            </th>
                                                            <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                                Submitted
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-50">
                                                        {analyticsData.map((r) => (
                                                            <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                                                            <span className="text-xs font-bold text-purple-600">
                                                                                {r.studentName?.[0]?.toUpperCase() ?? "?"}
                                                                            </span>
                                                                        </div>
                                                                        <div>
                                                                            <p className="font-semibold text-gray-900 text-xs">{r.studentName}</p>
                                                                            <p className="text-gray-400 text-xs">{r.email}</p>
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <span
                                                                            className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.percentage >= 75
                                                                                    ? "bg-green-100 text-green-700"
                                                                                    : r.percentage >= 50
                                                                                        ? "bg-yellow-100 text-yellow-700"
                                                                                        : "bg-red-100 text-red-700"
                                                                                }`}
                                                                        >
                                                                            {r.percentage}%
                                                                        </span>
                                                                        <span className="text-xs text-gray-500">
                                                                            {r.score}/{r.totalQuestions}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
                                                                        <Clock className="w-3 h-3 flex-shrink-0" />
                                                                        {Math.floor((r.timeTaken || 0) / 60)}m {(r.timeTaken || 0) % 60}s
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="text-xs text-gray-600 leading-snug">
                                                                        <span className="font-medium text-gray-800">
                                                                            {new Date(r.submittedAt).toLocaleTimeString(undefined, {
                                                                                hour: "numeric",
                                                                                minute: "2-digit",
                                                                            })}
                                                                        </span>
                                                                        <span className="text-gray-400 mx-1">·</span>
                                                                        <span className="text-gray-500">
                                                                            {new Date(r.submittedAt).toLocaleDateString(undefined, {
                                                                                day: "numeric",
                                                                                month: "short",
                                                                                year: "numeric",
                                                                            })}
                                                                        </span>
                                                                    </div>
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