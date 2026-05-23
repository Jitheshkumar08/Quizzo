"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Ban, BookOpen, CalendarClock, Check, Clock3, Copy, FileText, Infinity as InfinityIcon, Loader2, Lock, Play, Share2, Users } from "lucide-react";
import { TypewriterLoader } from "@/components/ui/TypewriterLoader";
import PasswordInput from "@/components/ui/PasswordInput";
import QuizTaker from "./QuizTaker";
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
  scheduledStart: string | null;
  scheduledEnd: string | null;
  timeLimitMinutes: number | null;
  createdByName: string;
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
}: {
  disabled?: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="quiz-start-action-btn flex h-[48px] w-full items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 fill-current" />}
      <span className="whitespace-nowrap">Start Now</span>
    </button>
  );
}

export default function QuizGate({
  quizId,
  startSummary,
}: {
  quizId: string;
  startSummary: QuizStartSummary;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [block, setBlock] = useState<BlockPayload | null>(null);
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const refreshTimer = useRef<number | null>(null);

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
    const href = `${window.location.origin}${startSummary.sharePath}`;

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

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
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
  const passwordRequired = startSummary.passwordProtected || code === "PASSWORD_REQUIRED";
  const canStartFromCurrentBlock = !code || code === "PASSWORD_REQUIRED";
  const hasSchedule = !!(startSummary.scheduledStart && startSummary.scheduledEnd);
  const description = startSummary.description?.trim() || "The creator has not added a description yet.";

  return (
    <div className="mx-auto max-w-3xl space-y-7 animate-fade-in-up py-8 sm:py-12">
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

      <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/80 p-6 shadow-[0_22px_60px_rgba(44,42,40,0.10)] ring-1 ring-[#E8E2D8]/80 backdrop-blur-2xl sm:p-8">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

        <div className="relative z-10 space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
              <div className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-100">
                <BookOpen className="h-6 w-6" />
              </div>

              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
                <span className="inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl border border-blue-100 bg-blue-50 px-3.5 text-sm font-black text-blue-600 shadow-sm">
                  <Users className="h-4 w-4" /> {startSummary.totalAttempts} Attempts
                </span>
                <span className="inline-flex h-10 items-center justify-center gap-1.5 rounded-2xl border border-purple-100 bg-purple-50 px-3.5 text-sm font-black text-purple-600 shadow-sm">
                  <BookOpen className="h-4 w-4" /> {startSummary.questionCount} Questions
                </span>
                <button
                  type="button"
                  onClick={copyShareLink}
                  className={`group/share inline-flex h-10 w-[166px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-2xl px-3.5 text-[13px] font-black tracking-[0.01em] shadow-[0_10px_24px_rgba(79,70,229,0.18)] transition-[background-color,box-shadow,transform] duration-300 ease-out hover:shadow-[0_16px_32px_rgba(79,70,229,0.24)] active:scale-[0.97] ${
                    copied
                      ? "bg-emerald-600 text-white hover:shadow-[0_16px_32px_rgba(5,150,105,0.22)]"
                      : "bg-violet-600 text-white hover:bg-violet-700"
                  }`}
                  aria-live="polite"
                >
                  <span className="relative flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-xl bg-white/18 ring-1 ring-white/18">
                    <Share2
                      className={`absolute h-4 w-4 transition-all duration-300 ease-out ${
                        copied ? "-translate-y-2 rotate-45 scale-75 opacity-0" : "translate-y-0 rotate-0 scale-100 opacity-100"
                      }`}
                    />
                    <Check
                      className={`absolute h-4 w-4 transition-all duration-300 ease-out ${
                        copied ? "translate-y-0 rotate-0 scale-100 opacity-100" : "translate-y-2 -rotate-45 scale-75 opacity-0"
                      }`}
                    />
                  </span>
                  <span className="relative h-5 w-[74px] overflow-hidden">
                    <span
                      className={`absolute inset-0 flex items-center justify-center whitespace-nowrap transition-all duration-300 ease-out ${
                        copied ? "-translate-y-full opacity-0 blur-[2px]" : "translate-y-0 opacity-100 blur-0"
                      }`}
                    >
                      Share Link
                    </span>
                    <span
                      className={`absolute inset-0 flex items-center justify-center whitespace-nowrap transition-all duration-300 ease-out ${
                        copied ? "translate-y-0 opacity-100 blur-0" : "translate-y-full opacity-0 blur-[2px]"
                      }`}
                    >
                      Copied!
                    </span>
                  </span>
                  <Copy
                    className={`h-3.5 w-3.5 flex-shrink-0 transition-all duration-300 ease-out ${
                      copied ? "translate-x-2 scale-75 opacity-0" : "translate-x-0 scale-100 opacity-70 group-hover/share:opacity-100"
                    }`}
                  />
                </button>
              </div>
            </div>

            <h1 className="max-w-full break-words text-2xl font-black leading-tight text-slate-950 [overflow-wrap:anywhere] sm:text-3xl">
              {title}
            </h1>
          </div>

          <p className="text-sm font-bold text-slate-500">
            Created by <span className="text-slate-800">{startSummary.createdByName}</span>
          </p>

          <div className="rounded-[24px] border border-[#ECE6DD] bg-[#FFFDF9]/80 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm ring-1 ring-[#ECE6DD]">
                <FileText className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Description</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold leading-relaxed text-slate-700">
                  {description}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {passwordRequired && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
                <Lock className="h-3.5 w-3.5" /> Password protected
              </span>
            )}
            {!passwordRequired && (
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                <Check className="h-3.5 w-3.5" /> No password
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
            <div className="rounded-[24px] border border-amber-100 bg-amber-50/45 p-4 sm:p-5">
              <div className="mb-4 flex items-start gap-3 text-sm font-semibold leading-relaxed text-slate-600">
                <Lock className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                <p>This quiz is protected. Enter the password, then start when you are ready.</p>
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

          <div className="flex flex-col gap-3 border-t border-[#ECE6DD] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold leading-relaxed text-slate-500">
              Your attempt will begin when you click Start Now.
            </p>
            <StartActionButton
              loading={loading || unlocking}
              disabled={!canStartFromCurrentBlock}
              onClick={startQuiz}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
