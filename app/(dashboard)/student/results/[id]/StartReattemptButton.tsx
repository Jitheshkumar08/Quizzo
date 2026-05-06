"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Target } from "lucide-react";

function LoadingLetters() {
  const letters = [
    ["l", "100ms"],
    ["o", "250ms"],
    ["a", "400ms"],
    ["d", "550ms"],
    ["i", "700ms"],
    ["n", "850ms"],
    ["g", "1000ms"],
  ];

  return (
    <span className="practice-missed-loader" aria-label="Loading">
      {letters.map(([letter, delay], index) => (
        <span key={`${letter}-${index}`} style={{ "--d": delay } as React.CSSProperties}>
          {letter}
        </span>
      ))}
    </span>
  );
}

interface Props {
  resultId: string;
  missedCount: number;
  incorrectCount: number;
  unattemptedCount: number;
}

export default function StartReattemptButton({
  resultId,
  missedCount,
  incorrectCount,
  unattemptedCount,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startReattempt() {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/results/${resultId}/reattempt`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok || !data.sessionId) {
        setError(typeof data.error === "string" ? data.error : "Could not start re-attempt");
        return;
      }

      router.push(`/student/reattempts/${data.sessionId}`);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="w-full">
      <style>{`
        .result-action-btn-outline {
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

        .result-action-btn-outline:hover {
          transform: translate(-0.05em, -0.05em);
          box-shadow: 0.15em 0.15em currentColor;
        }

        .result-action-btn-outline:active {
          transform: translate(0.05em, 0.05em);
          box-shadow: 0.05em 0.05em currentColor;
        }

        .practice-missed-loader {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .practice-missed-loader span {
          display: flex;
          min-width: 40px;
          height: 40px;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          background-color: #dbd5f3;
          color: #aa41fe;
          font-size: 30px;
          font-weight: 900;
          line-height: 1;
          text-transform: lowercase;
          animation: practice-missed-peek 1s both infinite;
          animation-delay: var(--d);
        }

        @keyframes practice-missed-peek {
          25% {
            transform: rotateX(30deg) rotate(-13deg);
          }
          50% {
            transform: translateY(-22px) rotate(3deg) scale(1.1);
            color: #6a45ed;
          }
        }

        @media (max-width: 520px) {
          .practice-missed-loader {
            gap: 5px;
          }

          .practice-missed-loader span {
            min-width: 32px;
            height: 34px;
            font-size: 23px;
          }
        }
      `}</style>
      {loading && (
        <div className="fixed inset-0 z-[100000] flex flex-col items-center justify-center gap-7 bg-[#FCF9F2]/92 p-6 backdrop-blur-xl">
          <div className="absolute inset-0 bg-[radial-gradient(#D8CDEB_1px,transparent_1px)] [background-size:24px_24px] opacity-50" />
          <div className="absolute h-[360px] w-[360px] rounded-full bg-purple-200/45 blur-[90px]" />
          <div className="relative z-10 text-center">
            <p className="mb-4 text-[13px] font-black uppercase tracking-[0.2em] text-[#8C5D3E]">
              Preparing practice
            </p>
            <LoadingLetters />
            <p className="mt-5 max-w-sm text-sm font-semibold text-[#6B6357]">
              Building a focused session with your incorrect and unattempted questions.
            </p>
          </div>
        </div>
      )}
      <div className="relative overflow-hidden rounded-[24px] border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-4 shadow-[0_14px_34px_rgba(20,184,166,0.14)] ring-1 ring-white/80 sm:p-5">
        <div className="absolute -right-10 -top-12 h-28 w-28 rounded-full bg-teal-200/45 blur-2xl" />
        <div className="relative grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_240px] md:items-center">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-teal-600 shadow-sm ring-1 ring-teal-100">
              <Target className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-base font-black leading-tight text-slate-950">Practice only what you missed</p>
              <p className="mt-1.5 max-w-xl text-sm font-semibold leading-relaxed text-slate-600">
                Starts a short quiz with your {incorrectCount} incorrect or {unattemptedCount} unattempted question{missedCount === 1 ? "" : "s"}.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={startReattempt}
            disabled={loading || missedCount === 0}
            className="result-action-btn-outline flex h-[46px] w-full items-center justify-center gap-2 bg-teal-50 text-teal-600 hover:bg-teal-100 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
            <span className="whitespace-nowrap">Practice Missed</span>
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
