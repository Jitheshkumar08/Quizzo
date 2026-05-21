"use client";
/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import ProgressSidebar from "./ProgressSidebar";
import QuestionCard from "./QuestionCard";
import { Clock, Send, AlertTriangle, ChevronLeft, ChevronRight, Timer } from "lucide-react";
import { SearchLoader } from "@/components/ui/SearchLoader";
import { hashCode, mulberry32 } from "@/lib/utils";
import { markQuizSubmittedForHistory } from "./quizBrowserHistory";

interface Question {
  id: string;
  questionText: string;
  options: { A: string; B: string; C: string; D: string };
  order: number;
}

interface QuizTakerProps {
  quizId: string;
  quizTitle: string;
  quizDescription?: string | null;
  questions: Question[];
  timeLimitMinutes?: number | null;
  attemptDeadline?: string | null;
  serverNow?: string | null;
  serverReceivedAt?: number;
  attemptStartedAt?: string | null;
  sessionId?: string | null;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  savedAnswers?: Record<string, string>;
  autosaveUrl?: string | null;
  submitUrl?: string;
}

const QUESTIONS_PER_PAGE = 5;

export default function QuizTaker({
  quizId,
  quizTitle,
  quizDescription,
  questions,
  timeLimitMinutes,
  attemptDeadline,
  serverNow,
  serverReceivedAt,
  attemptStartedAt,
  sessionId,
  shuffleQuestions,
  shuffleOptions,
  savedAnswers = {},
  autosaveUrl,
  submitUrl,
}: QuizTakerProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, string>>(savedAnswers);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(0);
  const [elapsed, setElapsed] = useState(() => {
    if (attemptStartedAt && serverNow) {
      const skew = new Date(serverNow).getTime() - (serverReceivedAt ?? Date.now());
      const serverStart = new Date(attemptStartedAt).getTime();
      const serverClockNow = Date.now() + skew;
      return Math.max(0, Math.floor((serverClockNow - serverStart) / 1000));
    }
    return 0;
  });
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showStickyControls, setShowStickyControls] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [remainingSec, setRemainingSec] = useState<number | null>(null); const [isTimeUp, setIsTimeUp] = useState(false); const [targetQuestionIndex, setTargetQuestionIndex] = useState<number | null>(null);
  const [errorPopup, setErrorPopup] = useState<{ message: string, code?: string } | null>(null);
  const [displayQuestions, setDisplayQuestions] = useState<Question[]>(
    () => {
      if (!shuffleQuestions) return questions;
      const seedStr = sessionId ? sessionId : (attemptStartedAt ? attemptStartedAt : "fallback-seed");
      const rand = mulberry32(Math.abs(hashCode(seedStr)));
      const shuffled = [...questions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    }
  );

  useEffect(() => {
    if (shuffleQuestions) {
      const seedStr = sessionId ? sessionId : (attemptStartedAt ? attemptStartedAt : "fallback-seed");
      const rand = mulberry32(Math.abs(hashCode(seedStr)));
      const shuffled = [...questions];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setDisplayQuestions(shuffled);
    } else {
      setDisplayQuestions(questions);
    }
    // Prevent stale "visited" ids from pre-shuffle order creating random skipped markers.
    setVisited(new Set());
    setCurrentPage(0);
    setTargetQuestionIndex(null);
  }, [attemptStartedAt, sessionId, shuffleQuestions, questions]);

  const answersRef = useRef(answers);
  const elapsedRef = useRef(0);
  const remainingSecRef = useRef(0);
  const topBarRef = useRef<HTMLDivElement | null>(null);
  const serverSkewMs = useRef(0);
  const submitLock = useRef(false);
  const autoSubmitFired = useRef(false);
  const autosaveTimer = useRef<number | null>(null);

  const hasTimer = !!(attemptDeadline && serverNow);

  useEffect(() => setMounted(true), []);

  const navigateToResultAfterSubmit = useCallback((href: string) => {
    window.history.replaceState(null, "", "/student/quizzes");
    router.push(href);
  }, [router]);

  useEffect(() => {
    if (!mounted) return;

    const topBar = topBarRef.current;
    if (!topBar) return;

    const scrollArea = document.getElementById("dashboard-scroll-area");
    const scrollTarget: HTMLElement | Window = scrollArea ?? window;

    const updateStickyControls = () => {
      const topBarRect = topBar.getBoundingClientRect();
      const viewportTop = scrollArea?.getBoundingClientRect().top ?? 0;
      setShowStickyControls(topBarRect.bottom < viewportTop + 28);
    };

    updateStickyControls();
    scrollTarget.addEventListener("scroll", updateStickyControls, { passive: true });
    window.addEventListener("resize", updateStickyControls);

    return () => {
      scrollTarget.removeEventListener("scroll", updateStickyControls);
      window.removeEventListener("resize", updateStickyControls);
    };
  }, [mounted]);

  useEffect(() => {
    answersRef.current = answers;

    const targetAutosaveUrl = autosaveUrl === undefined ? `/api/quiz/${quizId}/autosave` : autosaveUrl;
    if (!targetAutosaveUrl || Object.keys(answers).length === 0) return;

    if (autosaveTimer.current !== null) {
      window.clearTimeout(autosaveTimer.current);
    }

    autosaveTimer.current = window.setTimeout(() => {
      fetch(targetAutosaveUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userAnswers: answers }),
      }).catch(err => console.error("Failed to autosave:", err));

      autosaveTimer.current = null;
    }, 800);

    return () => {
      if (autosaveTimer.current !== null) {
        window.clearTimeout(autosaveTimer.current);
      }
    };
  }, [answers, quizId, autosaveUrl]);

  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);

  useEffect(() => {
    remainingSecRef.current = remainingSec ?? 0;
  }, [remainingSec]);

  useEffect(() => {
    if (!serverNow) return;
    serverSkewMs.current = new Date(serverNow).getTime() - (serverReceivedAt ?? Date.now());
  }, [serverNow, serverReceivedAt]);

  useEffect(() => {
    if (!attemptDeadline) {
      setRemainingSec(null);
      return;
    }
    const tick = () => {
      const end = new Date(attemptDeadline).getTime();
      const now = Date.now() + serverSkewMs.current;
      setRemainingSec(Math.max(0, Math.ceil((end - now) / 1000)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [attemptDeadline]);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const totalPages = Math.ceil(displayQuestions.length / QUESTIONS_PER_PAGE);
  const pageQuestions = displayQuestions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE
  );

  function markVisited(questionId: string) {
    setVisited((prev) => {
      if (prev.has(questionId)) return prev;
      const next = new Set(prev);
      next.add(questionId);
      return next;
    });
  }

  function formatTime(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function handleAnswer(questionId: string, key: string) {
    markVisited(questionId);
    setAnswers((prev) => ({ ...prev, [questionId]: key }));
  }

  function handleClear(questionId: string) {
    markVisited(questionId);
    setAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }

  function toggleFlag(questionId: string) {
    markVisited(questionId);
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  }

  function jumpToQuestion(index: number) {
    setCurrentPage(Math.floor(index / QUESTIONS_PER_PAGE));
    setTargetQuestionIndex(index);
  }

  function handlePageChange(newPage: number) {
    setCurrentPage(newPage);
    setTargetQuestionIndex(newPage * QUESTIONS_PER_PAGE);
  }

  useEffect(() => {
    if (targetQuestionIndex !== null) {
      setTimeout(() => {
        const el = document.getElementById(`question-${targetQuestionIndex}`);
        const scrollArea = document.getElementById("dashboard-scroll-area");
        if (el && scrollArea) {
          const scrollAreaRect = scrollArea.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();

          // Scroll so the target question is comfortably near the top of the view
          scrollArea.scrollTo({
            top: scrollArea.scrollTop + (elRect.top - scrollAreaRect.top) - 24,
            behavior: 'smooth'
          });
        } else if (el) {
          // Fallback if the layout changes
          const y = el.getBoundingClientRect().top + window.scrollY - 120;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 50);
      setTargetQuestionIndex(null);
    }
  }, [targetQuestionIndex, currentPage]);

  const runSubmit = useCallback(async () => {
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    setShowConfirm(false);
    try {
      const timeTakenSec =
        hasTimer && timeLimitMinutes != null
          ? Math.min(
            timeLimitMinutes * 60,
            Math.max(0, timeLimitMinutes * 60 - remainingSecRef.current)
          )
          : elapsedRef.current;

      const targetSubmitUrl = submitUrl ?? `/api/quiz/${quizId}/submit`;
      const res = await fetch(targetSubmitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userAnswers: answersRef.current, timeTaken: timeTakenSec }),
      });
      const data = await res.json();
      if (res.ok) {
        markQuizSubmittedForHistory(quizId);
        if (data.resultId) {
          navigateToResultAfterSubmit(`/student/results/${data.resultId}`);
        } else {
          router.replace(`/student/quizzes`);
        }
      } else {
        setErrorPopup({ message: data.error || "Submission failed", code: data.code });
      }
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }, [quizId, hasTimer, timeLimitMinutes, navigateToResultAfterSubmit, router, submitUrl]);

  useEffect(() => {
    if (!hasTimer || remainingSec === null || remainingSec > 0) return;
    if (autoSubmitFired.current || submitLock.current) return;
    autoSubmitFired.current = true;
    setIsTimeUp(true);
    void runSubmit();
  }, [hasTimer, remainingSec, runSubmit]);

  const answeredCount = questions.filter(q => answers[q.id] && answers[q.id].trim() !== "").length;
  const unansweredCount = questions.length - answeredCount;
  const timerToneClass =
    hasTimer && remainingSec !== null
      ? remainingSec <= 60
        ? "text-red-700 bg-red-50 border-red-200 shadow-red-900/5"
        : remainingSec <= 300
          ? "text-amber-800 bg-amber-50 border-amber-200 shadow-amber-900/5"
          : "text-purple-700 bg-purple-50 border-purple-100 shadow-purple-900/5"
      : "text-purple-600 bg-purple-50 border-purple-100 shadow-purple-900/5";
  const timerText = hasTimer && remainingSec !== null ? `Left ${formatTime(remainingSec)}` : formatTime(elapsed);
  const TimerIcon = hasTimer && remainingSec !== null ? Timer : Clock;

  function renderTimerBadge(sticky = false) {
    return (
      <div
        className={`inline-flex items-center gap-2 rounded-xl border font-mono font-bold ${timerToneClass} ${sticky
          ? "px-4 py-2 text-sm shadow-sm"
          : "px-3 py-1.5 text-sm"
          }`}
        aria-live={hasTimer ? "polite" : undefined}
      >
        <TimerIcon className="w-4 h-4 flex-shrink-0" />
        <span>{timerText}</span>
      </div>
    );
  }

  function renderAnsweredProgress(compact = false) {
    return (
      <div className={`flex min-w-0 items-center ${compact ? "gap-2" : "gap-3"}`}>
        <div className={`${compact ? "h-2 w-28" : "h-2.5 w-48 sm:w-64"} bg-gray-100 rounded-full overflow-hidden`}>
          <div
            className="h-full bg-purple-500 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${(answeredCount / questions.length) * 100}%`,
              minWidth: answeredCount > 0 ? "10px" : "0px",
            }}
          />
        </div>
        <p className={`${compact ? "text-[11px]" : "text-xs"} whitespace-nowrap text-gray-500 font-bold tracking-wide`}>
          {answeredCount} / {questions.length} ANSWERED
        </p>
      </div>
    );
  }

  return (
    <>
      <style>{`
      .submit-quiz-btn {
        background-color: transparent;
        width: 13em;
        height: 3.3em;
        border: 2px solid #1abc9c;
        border-radius: 25px;
        font-weight: bold;
        text-transform: uppercase;
        color: #1abc9c;
        padding: 2px;
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        overflow: hidden;
        cursor: pointer;
        font-size: 14px;
        outline: none;
      }
      .submit-quiz-btn .txt {
        transition: .4s ease-in-out;
        position: absolute;
        z-index: 1;
      }
      .submit-quiz-btn .txt2 {
        transform: translateY(1em) scale(0);
        color: #212121;
        position: absolute;
        font-weight: bold;
        text-transform: uppercase;
        z-index: 1;
        transition: .3s ease-in-out 0s;
      }
      .submit-quiz-btn .loader-container {
        height: 100%;
        width: 100%;
        background-color: transparent;
        border-radius: inherit;
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 0;
        position: absolute;
        overflow: hidden;
      }
      .submit-quiz-btn .loader-container .loader {
        height: 100%;
        width: 100%;
        background-color: #1abc9c;
        border-radius: inherit;
        transform: translateX(-13em);
        transition: none;
      }
      .submit-quiz-btn.is-animating {
        transition: height .4s ease-in-out .4s;
        animation: sqb-scaling 1.5s ease-in-out 0s 1 both;
      }
      .submit-quiz-btn.is-animating .txt {
        transform: translateY(-5em);
        transition: .4s ease-in-out;
      }
      .submit-quiz-btn.is-animating .txt2 {
        transform: translateY(0) scale(1);
        transition: .3s ease-in-out 1.7s;
      }
      .submit-quiz-btn.is-animating .loader {
        transform: translate(0);
        transition: .8s cubic-bezier(0,.4,1,.28) .4s;
      }
      @keyframes sqb-scaling {
        20% { height: 1.5em; }
        80% { height: 1.5em; }
        100% { height: 3.3em; }
      }
    `}</style>
      <div className={`min-h-[calc(100vh-8rem)] transition-all duration-300 ease-in-out ${sidebarOpen ? "lg:pr-[240px] pr-0" : "pr-0"}`}>

        {/* Main Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 transition-all duration-300">
          {/* Top bar */}
          <div ref={topBarRef} className="bg-white rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-6 border border-black/5 shadow-sm relative overflow-hidden">
            {/* Decorative background accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-purple-100/50 via-transparent to-transparent rounded-bl-full pointer-events-none"></div>

            <div className="flex-1 min-w-0 w-full relative z-10">
              <h1 className="text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight leading-tight">
                {quizTitle}
              </h1>
              {quizDescription && (
                <p className="text-sm md:text-base text-gray-600 mt-2 leading-relaxed max-w-4xl line-clamp-2">
                  {quizDescription}
                </p>
              )}
              <div className="flex items-center gap-3 mt-4">
                {renderAnsweredProgress()}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between w-full md:w-auto gap-3 relative z-10 shrink-0">
              {renderTimerBadge()}
              <button
                onClick={() => setShowConfirm(true)}
                className="group relative inline-flex items-center justify-center px-5 sm:px-6 py-2 rounded-full text-sm font-bold text-green-600 bg-transparent shadow-[0_0_0_2px_rgba(34,197,94,0.2)] hover:shadow-[0_0_0_5px_rgba(34,197,94,0.3)] hover:text-white active:scale-95 transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Send className="w-4 h-4" /> Submit
                </span>
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-green-500 rounded-full opacity-0 group-hover:w-40 group-hover:h-40 group-hover:opacity-100 transition-all duration-[800ms] ease-[cubic-bezier(0.23,1,0.32,1)] z-0"></span>
              </button>
            </div>
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
                  shuffleOptions={shuffleOptions}
                  attemptStartedAt={attemptStartedAt}
                  sessionId={sessionId}
                  onViewed={() => markVisited(q.id)}
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
              onClick={() => handlePageChange(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-black/10 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
            >
              ← Previous
            </button>
            <span className="text-sm font-medium text-gray-500">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage >= totalPages - 1}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-black/10 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
            >
              Next →
            </button>
          </div>
        </div>

        {mounted && showStickyControls && !isTimeUp && createPortal(
          <div
            className="pointer-events-none fixed left-[calc(260px+2rem)] top-[14px] z-50 hidden max-w-[calc(100vw-260px-16rem)] transition-all duration-200 ease-out lg:block"
          >
            <div className="pointer-events-auto flex w-fit max-w-full items-center gap-3 rounded-2xl border border-black/10 bg-white/95 p-2 shadow-[0_3px_12px_rgba(15,23,42,0.06)] backdrop-blur-md">
              <div className="hidden min-w-0 items-center rounded-xl border border-slate-100 bg-white/80 px-3 py-2 lg:flex">
                {renderAnsweredProgress(true)}
              </div>
              {renderTimerBadge(true)}
              <button
                onClick={() => setShowConfirm(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-100 active:translate-y-0"
              >
                <Send className="w-4 h-4" />
                Submit
              </button>
            </div>
          </div>,
          document.body
        )}

        {/* Right Sidebar Portal */}
        {mounted && createPortal(
          <div
            className={`fixed right-0 top-[88px] bottom-0 z-40 transition-transform duration-300 ease-in-out flex items-start py-6 ${sidebarOpen ? "translate-x-0" : "translate-x-[calc(100%-24px)]"
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
            <div className="w-full h-full bg-white rounded-l-3xl border border-r-0 border-black/10 shadow-[-10px_0_30px_rgba(0,0,0,0.08)] p-4 overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-black/10 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-black/20">
              <ProgressSidebar
                questions={displayQuestions}
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

        {isTimeUp && mounted && createPortal(
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10001] p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full border border-black/5 shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto animate-pulse">
                <Timer className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="font-bold text-2xl text-gray-900">Time&apos;s Up!</h3>
              <p className="text-gray-500 text-sm pb-2">
                Your time has expired. We are automatically submitting your saved answers...
              </p>
              <div className="flex justify-center">
                <div className="w-6 h-6 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Confirm modal */}
        {showConfirm && !isTimeUp && mounted && createPortal(
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
                  onClick={() => {
                    if (animating || submitting) return;
                    setAnimating(true);
                    setTimeout(() => {
                      void runSubmit();
                    }, 2100);
                  }}
                  disabled={submitting}
                  className={`submit-quiz-btn ${animating ? "is-animating" : ""}`}
                >
                  <span className="txt">Submit</span>
                  <span className="txt2">Submitted!</span>
                  <span className="loader-container">
                    <span className="loader"></span>
                  </span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Error / Info popup centered */}
        {errorPopup && mounted && createPortal(
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[10000] p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full border border-black/5 shadow-2xl space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-gray-900">Notice</h3>
                  <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                    {errorPopup.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={() => {
                    setErrorPopup(null);
                    if (
                      errorPopup.code === "ENDED" ||
                      errorPopup.code === "TIME_EXPIRED" ||
                      errorPopup.code === "QUIZ_UNAVAILABLE" ||
                      errorPopup.code === "QUIZ_UPDATED" ||
                      errorPopup.code === "NOT_STARTED" ||
                      errorPopup.code === "MAX_ATTEMPTS" ||
                      errorPopup.code === "PASSWORD_REQUIRED" ||
                      errorPopup.code === "NO_SESSION"
                    ) {
                      router.replace("/student/quizzes");
                    }
                  }}
                  className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Global Loading Overlay while submitting API call happens */}
        {submitting && !isTimeUp && mounted && createPortal(
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-[99999] animate-in fade-in duration-200">
            <SearchLoader />
            <h2 className="mt-8 text-xl font-bold text-gray-800 animate-pulse">Submitting your answers...</h2>
            <p className="text-gray-500 mt-2">Please do not close this page.</p>
          </div>,
          document.body
        )}
      </div>
    </>
  );
}
