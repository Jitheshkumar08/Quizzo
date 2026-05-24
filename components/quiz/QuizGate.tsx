"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, BookOpen, CalendarClock, Check, Clock3, Copy, FileText, Infinity as InfinityIcon, Loader2, Lock, Play, Share2, Unlock, Users } from "lucide-react";
import { TypewriterLoader } from "@/components/ui/TypewriterLoader";
import PasswordInput from "@/components/ui/PasswordInput";
import QuizTaker from "./QuizTaker";
import TimerBadge from "./TimerBadge";
import ScheduleStartBadge from "./ScheduleStartBadge";
import { formatAppDateTime } from "@/lib/timezone";
import { getSupabaseRealtimeClient } from "@/lib/supabase-realtime-client";
import { markQuizStartIntent } from "./quizBrowserHistory";

interface Question {
  id: string;
  questionText: string;
  options: { A: string; B: string; C: string; D: string };
  order: number;
}

interface QuizPayload {
  id: string;
  title: string;
  description: string | null;
  questions: Question[];
  timeLimitMinutes: number | null;
  attemptDeadline: string | null;
  serverNow: string | null;
  serverReceivedAt: number;
  attemptStartedAt: string | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  savedAnswers?: Record<string, string>;
  sessionId?: string | null;
}

interface BlockPayload {
  error?: string;
  code?: string;
  title?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  attemptsUsed?: number;
}

interface QuizStartSummary {
  id: string;
  title: string;
  sharePath: string;
  description: string | null;
  totalAttempts: number;
  questionCount: number;
  passwordProtected: boolean;
  allowMultipleAttempts: boolean;
  closed: boolean;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  timeLimitMinutes: number | null;
  createdByName: string;
  activeSessionStartedAt: string | null;
  serverNow: string;
}

type QuizListEventPayload = {
  new?: {
    quizId?: string | null;
  };
};

function plural(value: number, singular: string, pluralLabel = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralLabel}`;
}

function StartActionButton({
  disabled,
  loading,
  onClick,
  label,
  state,
}: {
  disabled?: boolean;
  loading: boolean;
  onClick: () => void;
  label: string;
  state: "start" | "continue" | "closed" | "not-started";
}) {
  const ActionIcon = state === "closed" ? Ban : state === "not-started" ? CalendarClock : Play;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="quiz-start-action-btn mx-auto flex h-[48px] w-[70%] items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 sm:mx-0 sm:w-[240px]"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ActionIcon className={`h-4 w-4 ${state === "start" || state === "continue" ? "fill-current" : ""}`} />
      )}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

export default function QuizGate({
  quizId,
  startSummary,
  initialBlock,
}: {
  quizId: string;
  startSummary: QuizStartSummary;
  initialBlock?: BlockPayload | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [block, setBlock] = useState<BlockPayload | null>(initialBlock ?? null);
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [clientNowMs, setClientNowMs] = useState(() => Date.now());
  const refreshTimer = useRef<number | null>(null);
  const copyResetTimer = useRef<number | null>(null);

  const load = useCallback(async (): Promise<{ ok: boolean; code?: string }> => {
    setLoading(true);
    setBlock(null);
    setUnlockError(null);
    try {
      const res = await fetch(`/api/quiz/${encodeURIComponent(quizId)}`, { credentials: "include" });
      const data = await res.json();
      const serverReceivedAt = Date.now();
      if (res.ok) {
        setQuiz({
          id: data.id,
          title: data.title,
          description: data.description ?? null,
          questions: data.questions,
          timeLimitMinutes: data.timeLimitMinutes ?? null,
          attemptDeadline: data.attemptDeadline ?? null,
          serverNow: data.serverNow ?? null,
          serverReceivedAt,
          attemptStartedAt: data.attemptStartedAt ?? null,
          sessionId: data.sessionId ?? null,
          shuffleQuestions: !!data.shuffleQuestions,
          shuffleOptions: !!data.shuffleOptions,
          savedAnswers: data.savedAnswers || {},
        });
        setBlock(null);
        return { ok: true };
      } else {
        setQuiz(null);
        setBlock(data as BlockPayload);
        return {
          ok: false,
          code: typeof data?.code === "string" ? data.code : undefined,
        };
      }
    } catch {
      setQuiz(null);
      setBlock({ error: "Network error", code: "UNKNOWN" });
      return { ok: false, code: "UNKNOWN" };
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    router.prefetch("/student/quizzes");
  }, [router]);

  useEffect(() => {
    if (!startSummary.scheduledEnd) return;

    const scheduledEndMs = new Date(startSummary.scheduledEnd).getTime();
    const delayMs = scheduledEndMs - Date.now();
    const timer = window.setTimeout(() => {
      setClientNowMs(Date.now());
    }, Math.min(Math.max(delayMs + 250, 0), 2147483647));

    return () => window.clearTimeout(timer);
  }, [startSummary.scheduledEnd]);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current !== null) {
        window.clearTimeout(copyResetTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (quiz) return;

    const supabase = getSupabaseRealtimeClient();
    if (!supabase) return;

    const scheduleRefresh = (payload: QuizListEventPayload) => {
      const changedQuizId = payload.new?.quizId;
      if (changedQuizId && changedQuizId !== quizId) return;
      if (document.visibilityState !== "visible") return;

      if (refreshTimer.current !== null) {
        window.clearTimeout(refreshTimer.current);
      }

      refreshTimer.current = window.setTimeout(() => {
        router.refresh();
        refreshTimer.current = null;
      }, 250);
    };

    const channel = supabase
      .channel(`quizzo-quiz-start-events-${quizId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "QuizListEvent",
        },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimer.current !== null) {
        window.clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [quiz, quizId, router]);

  async function startQuiz() {
    if (loading || unlocking) return;
    setUnlocking(true);
    setUnlockError(null);
    setBlock(null);
    try {
      if (startSummary.passwordProtected && password.trim()) {
        const res = await fetch(`/api/quiz/${encodeURIComponent(quizId)}/unlock`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setUnlockError(typeof data.error === "string" ? data.error : "Could not unlock");
          return;
        }
        setPassword("");
      }

      markQuizStartIntent(quizId);
      const result = await load();
      if (!result.ok && result.code === "PASSWORD_REQUIRED" && startSummary.passwordProtected && !password.trim()) {
        setUnlockError("Enter the quiz password to start.");
      }
    } catch {
      setUnlockError("Network error");
    } finally {
      setUnlocking(false);
    }
  }

  async function copyShareLink() {
    setCopied(true);
    if (copyResetTimer.current !== null) {
      window.clearTimeout(copyResetTimer.current);
      copyResetTimer.current = null;
    }

    let sharePath = startSummary.sharePath;

    try {
      const res = await fetch(`/api/quiz/${encodeURIComponent(quizId)}/share`, {
        credentials: "include",
        cache: "no-store",
      });
      const data: unknown = await res.json();
      if (
        res.ok &&
        typeof data === "object" &&
        data !== null &&
        "sharePath" in data &&
        typeof data.sharePath === "string" &&
        data.sharePath.startsWith("/") &&
        !data.sharePath.startsWith("//")
      ) {
        sharePath = data.sharePath;
      }
    } catch {
      // Fall back to the currently rendered path if the fresh lookup fails.
    }

    const href = `${window.location.origin}${sharePath}`;

    try {
      await navigator.clipboard.writeText(href);
    } catch {
      const input = document.createElement("input");
      input.value = href;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }

    copyResetTimer.current = window.setTimeout(() => {
      setCopied(false);
      copyResetTimer.current = null;
    }, 1600);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-7">
        <TypewriterLoader />
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.28em] text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600">
            Loading quiz
          </p>
          <span className="h-1 w-20 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 animate-pulse" />
        </div>
      </div>
    );
  }

  if (quiz) {
    return (
      <QuizTaker
        quizId={quiz.id}
        quizTitle={quiz.title}
        quizDescription={quiz.description}
        questions={quiz.questions}
        timeLimitMinutes={quiz.timeLimitMinutes}
        attemptDeadline={quiz.attemptDeadline}
        serverNow={quiz.serverNow}
        serverReceivedAt={quiz.serverReceivedAt}
        attemptStartedAt={quiz.attemptStartedAt}
        sessionId={quiz.sessionId}
        shuffleQuestions={quiz.shuffleQuestions}
        shuffleOptions={quiz.shuffleOptions}
        savedAnswers={quiz.savedAnswers}
      />
    );
  }

  const title = block?.title ?? startSummary.title;
  const code = block?.code;
  const hasSchedule = !!(startSummary.scheduledStart && startSummary.scheduledEnd);
  const description = startSummary.description?.trim() || "The creator has not added a description yet.";
  const scheduledNotStarted = startSummary.scheduledStart ? clientNowMs < new Date(startSummary.scheduledStart).getTime() : false;
  const scheduledEnded = startSummary.scheduledEnd ? clientNowMs > new Date(startSummary.scheduledEnd).getTime() : false;
  const quizClosed = startSummary.closed || code === "ENDED" || scheduledEnded;
  const quizNotStarted = !quizClosed && (code === "NOT_STARTED" || scheduledNotStarted);
  const passwordRequired = (startSummary.passwordProtected || code === "PASSWORD_REQUIRED") && !quizNotStarted && !quizClosed && code !== "MAX_ATTEMPTS";
  const canStartFromCurrentBlock = (!code || code === "PASSWORD_REQUIRED") && !quizNotStarted;
  const canContinue = !!startSummary.activeSessionStartedAt && !quizClosed && !quizNotStarted;
  const showStartCountdown = quizNotStarted && !!startSummary.scheduledStart;
  const hasHeaderStatus = canContinue || showStartCountdown;
  const startActionLabel = quizClosed ? "Closed" : quizNotStarted ? "Not started" : canContinue ? "Continue" : "Start Now";
  const startActionState = quizClosed ? "closed" : quizNotStarted ? "not-started" : canContinue ? "continue" : "start";

  return (
    <div className="mx-auto max-w-3xl space-y-4 animate-fade-in-up py-3 sm:py-4 lg:py-5">
      <style>{`
        .quiz-start-action-btn {
          font-family: inherit;
          padding: 0.5em 1.1em;
          font-weight: 900;
          font-size: 14px;
          border: 3px solid currentColor;
          border-radius: 0.4em;
          box-shadow: 0.1em 0.1em currentColor;
          cursor: pointer;
          transition: transform 120ms ease, box-shadow 120ms ease, background-color 120ms ease;
        }

        .quiz-start-action-btn:hover:not(:disabled) {
          transform: translate(-0.05em, -0.05em);
          box-shadow: 0.15em 0.15em currentColor;
        }

        .quiz-start-action-btn:active:not(:disabled) {
          transform: translate(0.05em, 0.05em);
          box-shadow: 0.05em 0.05em currentColor;
        }
      `}</style>
      <Link
        href="/student/quizzes"
        className="inline-flex items-center gap-2 text-sm font-bold text-purple-600 transition-colors hover:text-purple-700"
      >
        <ArrowLeft className="w-4 h-4" /> Back to quizzes
      </Link>

      <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_22px_60px_rgba(44,42,40,0.10)] ring-1 ring-[#E8E2D8]/80 backdrop-blur-2xl sm:rounded-[32px] sm:p-8">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

        <div className="relative z-10 space-y-8 sm:space-y-6">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex w-full flex-col items-center gap-2 sm:grid sm:grid-cols-[48px_minmax(0,1fr)_minmax(0,1fr)_166px] sm:items-center sm:gap-2 lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-4">
              <div className="order-2 inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100 sm:order-none sm:h-12 sm:w-12">
                <BookOpen className="h-6 w-6 sm:h-6 sm:w-6" />
              </div>

              <div className={`order-1 grid w-full gap-2 sm:contents lg:flex lg:min-w-0 lg:flex-wrap lg:items-center lg:justify-end lg:gap-2 ${hasHeaderStatus ? "grid-cols-2 min-[430px]:grid-cols-4" : "grid-cols-3"}`}>
                {canContinue && (
                  <TimerBadge
                    quizId={quizId}
                    startTime={startSummary.activeSessionStartedAt!}
                    timeLimitMinutes={startSummary.timeLimitMinutes}
                    scheduledEnd={startSummary.scheduledEnd}
                    serverNow={startSummary.serverNow}
                  />
                )}
                {showStartCountdown && (
                  <ScheduleStartBadge
                    scheduledStart={startSummary.scheduledStart!}
                    serverNow={startSummary.serverNow}
                  />
                )}
                <span className="inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-2xl border border-blue-100 bg-blue-50 px-1.5 text-[10px] font-black text-blue-600 shadow-sm sm:h-10 sm:w-auto sm:gap-1.5 sm:px-3.5 sm:text-sm">
                  <Users className="h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4" />
                  <span className="truncate">{startSummary.totalAttempts} Attempts</span>
                </span>
                <span className="inline-flex h-9 min-w-0 items-center justify-center gap-1 rounded-2xl border border-purple-100 bg-purple-50 px-1.5 text-[10px] font-black text-purple-600 shadow-sm sm:h-10 sm:w-auto sm:gap-1.5 sm:px-3.5 sm:text-sm">
                  <BookOpen className="h-3.5 w-3.5 flex-shrink-0 sm:h-4 sm:w-4" />
                  <span className="truncate">{startSummary.questionCount} Questions</span>
                </span>
                <button
                  type="button"
                  onClick={copyShareLink}
                  className={`group/share inline-flex h-9 w-full cursor-pointer items-center justify-center gap-1 overflow-hidden rounded-2xl px-1.5 text-[10px] font-black tracking-[0.01em] shadow-[0_10px_24px_rgba(79,70,229,0.18)] transition-[background-color,box-shadow,transform] duration-300 ease-out hover:shadow-[0_16px_32px_rgba(79,70,229,0.24)] active:scale-[0.97] sm:h-10 sm:w-[166px] sm:gap-2 sm:px-3.5 sm:text-[13px] ${copied
                      ? "bg-emerald-600 text-white hover:shadow-[0_16px_32px_rgba(5,150,105,0.22)]"
                      : "bg-violet-600 text-white hover:bg-violet-700"
                    }`}
                  aria-live="polite"
                >
                  <span className="relative flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg bg-white/18 ring-1 ring-white/18 sm:h-6 sm:w-6 sm:rounded-xl">
                    <Share2
                      className={`absolute h-3.5 w-3.5 transition-all duration-300 ease-out sm:h-4 sm:w-4 ${copied ? "-translate-y-2 rotate-45 scale-75 opacity-0" : "translate-y-0 rotate-0 scale-100 opacity-100"
                        }`}
                    />
                    <Check
                      className={`absolute h-3.5 w-3.5 transition-all duration-300 ease-out sm:h-4 sm:w-4 ${copied ? "translate-y-0 rotate-0 scale-100 opacity-100" : "translate-y-2 -rotate-45 scale-75 opacity-0"
                        }`}
                    />
                  </span>
                  <span className="relative h-4 w-[42px] overflow-hidden sm:h-5 sm:w-[74px]">
                    <span
                      className={`absolute inset-0 flex items-center justify-center whitespace-nowrap transition-all duration-300 ease-out ${copied ? "-translate-y-full opacity-0 blur-[2px]" : "translate-y-0 opacity-100 blur-0"
                        }`}
                    >
                      <span className="sm:hidden">Share</span>
                      <span className="hidden sm:inline">Share Link</span>
                    </span>
                    <span
                      className={`absolute inset-0 flex items-center justify-center whitespace-nowrap transition-all duration-300 ease-out ${copied ? "translate-y-0 opacity-100 blur-0" : "translate-y-full opacity-0 blur-[2px]"
                        }`}
                    >
                      <span className="sm:hidden">Copied</span>
                      <span className="hidden sm:inline">Copied!</span>
                    </span>
                  </span>
                  <Copy
                    className={`hidden h-3.5 w-3.5 flex-shrink-0 transition-all duration-300 ease-out sm:block ${copied ? "translate-x-2 scale-75 opacity-0" : "translate-x-0 scale-100 opacity-70 group-hover/share:opacity-100"
                      }`}
                  />
                </button>
              </div>
            </div>

            <h1 className="max-w-full break-words text-center text-2xl font-black leading-tight text-slate-950 [overflow-wrap:anywhere] sm:text-3xl lg:text-left">
              {title}
            </h1>
          </div>

          <p className="text-center text-sm font-bold text-slate-500 lg:text-left">
            Created by <span className="text-slate-800">{startSummary.createdByName}</span>
          </p>

          <div className="rounded-[24px] border border-[#ECE6DD] bg-[#FFFDF9]/80 p-5 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-[#ECE6DD]">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Description</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed text-slate-700 [overflow-wrap:anywhere]">
                  {description}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 max-sm:justify-center">
            {passwordRequired && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
                <Lock className="h-3.5 w-3.5" /> Password protected
              </span>
            )}
            {!passwordRequired && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                <Unlock className="h-3.5 w-3.5" /> No password
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600">
              {startSummary.allowMultipleAttempts ? <InfinityIcon className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
              {startSummary.allowMultipleAttempts ? "Multiple attempts" : "Single attempt"}
            </span>
            {startSummary.timeLimitMinutes ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-purple-100 bg-purple-50 px-3 py-1.5 text-xs font-black text-purple-700">
                <Clock3 className="h-3.5 w-3.5" /> {startSummary.timeLimitMinutes} min limit
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-1.5 text-xs font-black text-cyan-700">
                <Clock3 className="h-3.5 w-3.5" /> No time limit
              </span>
            )}
          </div>

          {hasSchedule && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/55 px-4 py-3 text-sm font-semibold leading-relaxed text-slate-600">
              <span className="font-black uppercase tracking-[0.12em] text-blue-600">Schedule</span>{" "}
              Starts {formatAppDateTime(startSummary.scheduledStart!)} | Ends {formatAppDateTime(startSummary.scheduledEnd!)}
            </div>
          )}

          {passwordRequired && (
            <div className="rounded-[24px] border border-amber-100 bg-amber-50/45 p-5 sm:p-5">
              <div className="mb-4 flex items-start gap-3 text-sm font-semibold leading-relaxed text-slate-600">
                <Lock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                <p className="break-words [overflow-wrap:anywhere]">This quiz is protected. Enter the password, then start when you are ready.</p>
              </div>
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Quiz password</span>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  wrapperClassName="mt-1"
                  className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                  placeholder="Enter password"
                  autoComplete="off"
                />
              </label>
            </div>
          )}

          {code === "NOT_STARTED" && block?.scheduledStart && (
            <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-slate-600">
              <CalendarClock className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
              <p>
                This quiz is not open yet. It starts{" "}
                <strong className="font-black text-slate-950">
                  {formatAppDateTime(block.scheduledStart)}
                </strong>
                .
              </p>
            </div>
          )}

          {code === "ENDED" && block?.scheduledEnd && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-slate-600">
              <Ban className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
              <p>
                This quiz closed on{" "}
                <strong className="font-black text-slate-950">
                  {formatAppDateTime(block.scheduledEnd)}
                </strong>
                .
              </p>
            </div>
          )}

          {code === "MAX_ATTEMPTS" && (
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
              <Ban className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-500" />
              <p>
                You have already completed this quiz
                {typeof block?.attemptsUsed === "number" ? ` (${plural(block.attemptsUsed, "attempt")})` : ""}.
                Multiple attempts are not allowed.
              </p>
            </div>
          )}

          {code !== "PASSWORD_REQUIRED" &&
            code !== "NOT_STARTED" &&
            code !== "ENDED" &&
            code !== "MAX_ATTEMPTS" &&
            block?.error && (
              <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{block.error}</p>
            )}

          {unlockError && (
            <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{unlockError}</p>
          )}

          {code !== "MAX_ATTEMPTS" && (
            <div className="flex flex-col gap-6 border-t border-[#ECE6DD] pt-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pt-6">
              <p className="text-center text-sm font-semibold leading-relaxed text-slate-500 sm:text-left">
                {quizClosed
                  ? "This quiz is closed."
                  : quizNotStarted
                    ? "This quiz has not started yet."
                  : canContinue
                    ? "Continue your saved attempt before the timer ends."
                    : "Your attempt will begin when you click Start Now."}
              </p>
              <StartActionButton
                loading={loading || unlocking}
                disabled={quizClosed || quizNotStarted || !canStartFromCurrentBlock}
                onClick={startQuiz}
                label={startActionLabel}
                state={startActionState}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
