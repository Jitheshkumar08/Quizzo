"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Lock, CalendarClock, Ban, ArrowLeft, KeyRound } from "lucide-react";
import QuizTaker from "./QuizTaker";

interface Question {
  id: string;
  questionText: string;
  options: { A: string; B: string; C: string; D: string };
  order: number;
}

interface QuizPayload {
  id: string;
  title: string;
  questions: Question[];
  timeLimitMinutes: number | null;
  attemptDeadline: string | null;
  serverNow: string | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  savedAnswers?: Record<string, string>;
}

interface BlockPayload {
  error?: string;
  code?: string;
  title?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  attemptsUsed?: number;
}

export default function QuizGate({ quizId }: { quizId: string }) {
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<QuizPayload | null>(null);
  const [block, setBlock] = useState<BlockPayload | null>(null);
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setBlock(null);
    setUnlockError(null);
    try {
      const res = await fetch(`/api/quiz/${encodeURIComponent(quizId)}`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) {
        setQuiz({
          id: data.id,
          title: data.title,
          questions: data.questions,
          timeLimitMinutes: data.timeLimitMinutes ?? null,
          attemptDeadline: data.attemptDeadline ?? null,
          serverNow: data.serverNow ?? null,
          shuffleQuestions: !!data.shuffleQuestions,
          shuffleOptions: !!data.shuffleOptions,
          savedAnswers: data.savedAnswers || {},
        });
        setBlock(null);
      } else {
        setQuiz(null);
        setBlock(data as BlockPayload);
      }
    } catch {
      setQuiz(null);
      setBlock({ error: "Network error", code: "UNKNOWN" });
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    load();
  }, [load]);

  async function tryUnlock(e: React.FormEvent) {
    e.preventDefault();
    setUnlocking(true);
    setUnlockError(null);
    try {
      const res = await fetch(`/api/quiz/${encodeURIComponent(quizId)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (res.ok) {
        setPassword("");
        await load();
      } else {
        setUnlockError(typeof data.error === "string" ? data.error : "Could not unlock");
      }
    } catch {
      setUnlockError("Network error");
    } finally {
      setUnlocking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        <p className="text-sm text-muted-foreground">Loading quiz…</p>
      </div>
    );
  }

  if (quiz) {
    return (
      <QuizTaker
        quizId={quiz.id}
        quizTitle={quiz.title}
        questions={quiz.questions}
        timeLimitMinutes={quiz.timeLimitMinutes}
        attemptDeadline={quiz.attemptDeadline}
        serverNow={quiz.serverNow}
        shuffleQuestions={quiz.shuffleQuestions}
        shuffleOptions={quiz.shuffleOptions}
        savedAnswers={quiz.savedAnswers}
      />
    );
  }

  const title = block?.title ?? "Quiz";
  const code = block?.code;

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in-up py-8">
      <Link
        href="/student/quizzes"
        className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700"
      >
        <ArrowLeft className="w-4 h-4" /> Back to quizzes
      </Link>

      <div className="glass rounded-3xl p-8 border border-black/5 space-y-4">
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>

        {code === "PASSWORD_REQUIRED" && (
          <>
            <div className="flex items-start gap-3 text-sm text-gray-600">
              <Lock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p>Your instructor has protected this quiz with a password. Enter it below to continue.</p>
            </div>
            <form onSubmit={tryUnlock} className="space-y-3">
              <label className="block">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quiz password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full px-4 py-3 rounded-xl border border-black/10 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400/40"
                  placeholder="Enter password"
                  autoComplete="off"
                />
              </label>
              {unlockError && <p className="text-sm text-red-600">{unlockError}</p>}
              <button
                type="submit"
                disabled={unlocking || !password.trim()}
                className="w-full py-3 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Continue
              </button>
            </form>
          </>
        )}

        {code === "NOT_STARTED" && block?.scheduledStart && (
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <CalendarClock className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p>
              This quiz is not open yet. It starts{" "}
              <strong className="text-gray-900">
                {new Date(block.scheduledStart).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </strong>
              .
            </p>
          </div>
        )}

        {code === "ENDED" && block?.scheduledEnd && (
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <Ban className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p>
              This quiz closed on{" "}
              <strong className="text-gray-900">
                {new Date(block.scheduledEnd).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </strong>
              .
            </p>
          </div>
        )}

        {code === "MAX_ATTEMPTS" && (
          <div className="flex items-start gap-3 text-sm text-gray-600">
            <Ban className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
            <p>
              You have already completed this quiz
              {typeof block?.attemptsUsed === "number" ? ` (${block.attemptsUsed} attempt${block.attemptsUsed !== 1 ? "s" : ""})` : ""}.
              Multiple attempts are not allowed.
            </p>
          </div>
        )}

        {code !== "PASSWORD_REQUIRED" &&
          code !== "NOT_STARTED" &&
          code !== "ENDED" &&
          code !== "MAX_ATTEMPTS" && (
            <p className="text-sm text-gray-600">{block?.error ?? "This quiz is not available."}</p>
          )}
      </div>
    </div>
  );
}
