"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import ProgressSidebar from "./ProgressSidebar";
import QuestionCard from "./QuestionCard";
import { Clock, Send, AlertTriangle, X, ChevronLeft, ChevronRight } from "lucide-react";

interface Question {
  id: string;
  questionText: string;
  options: { A: string; B: string; C: string; D: string };
  order: number;
}

interface QuizTakerProps {
  quizId: string;
  quizTitle: string;
  questions: Question[];
}


const QUESTIONS_PER_PAGE = 5;

export default function QuizTaker({ quizId, quizTitle, questions }: QuizTakerProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => setMounted(true), []);

  const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
  const pageQuestions = questions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE
  );

  // Timer
  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Mark current page questions as visited
  useEffect(() => {
    setVisited((prev) => {
      const next = new Set(prev);
      pageQuestions.forEach((q) => next.add(q.id));
      return next;
    });
  }, [currentPage]);

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function handleAnswer(questionId: string, key: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: key }));
  }

  function handleClear(questionId: string) {
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }

  function toggleFlag(questionId: string) {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  function jumpToQuestion(index: number) {
    setCurrentPage(Math.floor(index / QUESTIONS_PER_PAGE));
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/quiz/${quizId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAnswers: answers, timeTaken: elapsed }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/student/results/${data.resultId}`);
      } else {
        alert(data.error || "Submission failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = questions.length - answeredCount;

  return (
    <div className="flex gap-6 min-h-[calc(100vh-8rem)]">

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-4 transition-all duration-300">
        {/* Top bar */}
        <div className="bg-white rounded-2xl p-4 flex items-center gap-4 border border-black/5 shadow-sm">
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm truncate text-gray-900">{quizTitle}</h1>
            <p className="text-xs text-gray-500 font-medium">
              {answeredCount}/{questions.length} answered
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-mono font-bold text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
            <Clock className="w-4 h-4" />
            {formatTime(elapsed)}
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg, hsl(262 80% 65%), hsl(199 89% 48%))" }}
          >
            <Send className="w-4 h-4" /> Submit
          </button>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {pageQuestions.map((q, localIndex) => {
            const globalIndex = currentPage * QUESTIONS_PER_PAGE + localIndex;
            return (
              <QuestionCard
                key={q.id}
                question={q}
                index={globalIndex}
                selected={answers[q.id] ?? null}
                isFlagged={flagged.has(q.id)}
                onAnswer={(key) => handleAnswer(q.id, key)}
                onClear={() => handleClear(q.id)}
                onFlag={() => toggleFlag(q.id)}
              />
            );
          })}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-black/10 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
          >
            ← Previous
          </button>
          <span className="text-sm font-medium text-gray-500">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage >= totalPages - 1}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-black/10 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Right Sidebar Portal */}
      {mounted && createPortal(
        <div 
          className={`fixed right-0 top-[88px] bottom-0 z-40 transition-transform duration-300 ease-in-out flex items-start ${
            sidebarOpen ? "translate-x-0" : "translate-x-[calc(100%-24px)]"
          }`}
          style={{ width: "260px" }}
        >
          {/* Toggle Button */}
          <div className="absolute top-24 -left-8 z-50">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-8 h-14 bg-white border border-black/10 border-r-0 rounded-l-xl shadow-[-6px_0_12px_rgba(0,0,0,0.04)] flex items-center justify-center text-gray-400 hover:text-purple-600 transition-colors"
            >
              {sidebarOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          {/* Sidebar Content Container */}
          <div className="w-full h-full bg-white rounded-tl-3xl border-l border-black/10 shadow-[-10px_0_30px_rgba(0,0,0,0.08)] p-4 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-black/20">
            <ProgressSidebar
              questions={questions}
              answers={answers}
              flagged={flagged}
              visited={visited}
              currentPage={currentPage}
              questionsPerPage={QUESTIONS_PER_PAGE}
              onJump={jumpToQuestion}
            />
          </div>
        </div>,
        document.body
      )}

      {/* Confirm modal */}
      {showConfirm && mounted && createPortal(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full border border-black/5 shadow-2xl space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <h3 className="font-bold text-xl text-gray-900">Submit Quiz?</h3>
                <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                  You have answered <strong className="text-gray-900">{answeredCount}</strong> of{" "}
                  <strong className="text-gray-900">{questions.length}</strong> questions.
                  {unansweredCount > 0 && (
                    <span className="text-orange-600 font-semibold block mt-1"> {unansweredCount} unanswered.</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                disabled={submitting}
              >
                Continue taking
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, hsl(262 80% 65%), hsl(199 89% 48%))" }}
              >
                {submitting ? "Submitting..." : "Yes, Submit"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
