"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Target } from "lucide-react";

interface Props {
  resultId: string;
  missedCount: number;
}

export default function StartReattemptButton({ resultId, missedCount }: Props) {
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full sm:w-auto">
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
      `}</style>
      <button
        type="button"
        onClick={startReattempt}
        disabled={loading || missedCount === 0}
        className="result-action-btn-outline flex h-[42px] w-full items-center justify-center gap-2 bg-teal-50 text-teal-600 hover:bg-teal-100 disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
        <span className="whitespace-nowrap">Practice Missed</span>
      </button>
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
