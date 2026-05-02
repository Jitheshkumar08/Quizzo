"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ProgressSidebar from "@/components/quiz/ProgressSidebar";
import QuestionCard from "@/components/quiz/QuestionCard";
import { Clock, Send, AlertTriangle, X } from "lucide-react";

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
      {/* Sidebar */}
      <ProgressSidebar
        questions={questions}
        answers={answers}
        flagged={flagged}
        visited={visited}
        currentPage={currentPage}
        questionsPerPage={QUESTIONS_PER_PAGE}
        onJump={jumpToQuestion}
      />

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Top bar */}
        <div className="glass rounded-2xl p-4 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-sm truncate">{quizTitle}</h1>
            <p className="text-xs text-muted-foreground">
              {answeredCount}/{questions.length} answered
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-mono font-semibold text-cyan-400">
            <Clock className="w-4 h-4" />
            {formatTime(elapsed)}
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
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
            className="px-4 py-2 rounded-xl text-sm font-medium glass glass-hover disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage >= totalPages - 1}
            className="px-4 py-2 rounded-xl text-sm font-medium glass glass-hover disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-8 max-w-sm w-full border border-white/10 space-y-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-lg">Submit Quiz?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You have answered <strong className="text-foreground">{answeredCount}</strong> of{" "}
                  <strong className="text-foreground">{questions.length}</strong> questions.
                  {unansweredCount > 0 && (
                    <span className="text-yellow-400"> {unansweredCount} unanswered.</span>
                  )}
                </p>
              </div>
              <button onClick={() => setShowConfirm(false)} className="text-muted-foreground hover:text-foreground ml-auto">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium glass glass-hover"
              >
                Review
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, hsl(262 80% 65%), hsl(199 89% 48%))" }}
              >
                {submitting ? "Submitting..." : "Confirm Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
