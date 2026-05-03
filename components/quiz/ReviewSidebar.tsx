"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Question {
    id: string;
    order: number;
    correctAnswer: string;
}

interface ReviewSidebarProps {
    questions: Question[];
    userAnswers: Record<string, string>;
    isOpen: boolean;
    onToggle: (v: boolean) => void;
    onJump?: (index: number) => void;
}

export default function ReviewSidebar({
    questions,
    userAnswers,
    isOpen,
    onToggle,
    onJump,
}: ReviewSidebarProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    function handleJump(index: number) {
        if (onJump) {
            onJump(index);
        } else {
            const el = document.getElementById(`question-${index}`);
            const scrollArea = document.getElementById("dashboard-scroll-area");
            if (el && scrollArea) {
              const scrollAreaRect = scrollArea.getBoundingClientRect();
              const elRect = el.getBoundingClientRect();
              scrollArea.scrollTo({
                top: scrollArea.scrollTop + (elRect.top - scrollAreaRect.top) - 24,
                behavior: 'smooth'
              });
            } else if (el) {
                const y = el.getBoundingClientRect().top + window.scrollY - 120;
                window.scrollTo({ top: y, behavior: "smooth" });
            }
        }
    }

    function getStatus(q: Question): "correct" | "incorrect" | "unattempted" {
        const answered = userAnswers[q.id];
        if (!answered) return "unattempted";
        if (answered === q.correctAnswer) return "correct";
        return "incorrect";
    }

    const statusStyles: Record<string, string> = {
        correct: "bg-green-500 text-white border-green-600 shadow-sm",
        incorrect: "bg-red-500 text-white border-red-600 shadow-sm",
        unattempted: "bg-gray-200 text-gray-500 border-black/5",
    };

    const stats = {
        correct: questions.filter((q) => getStatus(q) === "correct").length,
        incorrect: questions.filter((q) => getStatus(q) === "incorrect").length,
        unattempted: questions.filter((q) => getStatus(q) === "unattempted").length,
    };

    if (!mounted) return null;

    // The toggle tab is a SEPARATE fixed element — it is never a child of the
    // sliding panel, so overflow-x-hidden on the scroll area cannot clip it.
    const toggleTab = (
        <div
            className="fixed z-50"
            style={{
                right: isOpen ? "260px" : "0px",
                top: "calc(88px + 96px)",
                transition: "right 300ms cubic-bezier(0.4,0,0.2,1)",
                willChange: "right",
            }}
        >
            <button
                onClick={() => onToggle(!isOpen)}
                className="w-8 h-14 bg-white border border-black/10 border-r-0 rounded-l-xl shadow-[-6px_0_12px_rgba(0,0,0,0.04)] flex items-center justify-center text-gray-400 hover:text-purple-600 transition-colors"
                aria-label={isOpen ? "Hide review panel" : "Show review panel"}
            >
                {isOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
        </div>
    );

    return createPortal(
        <>
        {toggleTab}
        <div
            className="fixed right-0 top-[88px] bottom-0 z-40 flex items-start py-6"
            style={{
                width: "260px",
                transform: isOpen ? "translateX(0)" : "translateX(100%)",
                transition: "transform 300ms cubic-bezier(0.4,0,0.2,1)",
                willChange: "transform",
            }}
        >

            <div className="w-[calc(100%-24px)] h-full bg-white/80 backdrop-blur-xl rounded-l-3xl border border-black/5 border-r-0 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] overflow-y-auto px-5 py-6 no-scrollbar relative overflow-hidden">
                <div className="space-y-4 relative z-10">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Review Questions</h3>

                    <div className="grid grid-cols-5 gap-1.5">
                        {questions.map((q, i) => {
                            const status = getStatus(q);
                            return (
                                <button
                                    key={q.id}
                                    onClick={() => handleJump(i)}
                                    className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all duration-150 hover:scale-105 ${statusStyles[status]}`}
                                    title={`Question ${i + 1}: ${status}`}
                                >
                                    {i + 1}
                                </button>
                            );
                        })}
                    </div>

                    <div className="space-y-1.5 pt-4 border-t border-gray-100">
                        {[
                            { color: "bg-green-500", label: `Correct (${stats.correct})` },
                            { color: "bg-red-500", label: `Incorrect (${stats.incorrect})` },
                            { color: "bg-gray-200", label: `Skipped (${stats.unattempted})` },
                        ].map(({ color, label }) => (
                            <div key={label} className="flex items-center gap-2">
                                <span className={`w-3 h-3 rounded-sm flex-shrink-0 ${color} shadow-sm border border-black/5`} />
                                <span className="text-xs text-gray-500 font-medium">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Decorative background element exactly like QuizTaker */}
                <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
            </div>
        </div>
        </>,
        document.body
    );
}
