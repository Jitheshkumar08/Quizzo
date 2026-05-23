"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

function isSafeSharePath(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

export default function QuizShareButton({
  quizId,
  initialSharePath,
  disabled = false,
  disabledTitle = "Publish quiz to share",
  className = "",
}: {
  quizId: string;
  initialSharePath?: string | null;
  disabled?: boolean;
  disabledTitle?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copyResetTimer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimer.current !== null) {
        window.clearTimeout(copyResetTimer.current);
      }
    };
  }, []);

  async function copyShareLink() {
    if (disabled) return;

    setCopied(true);
    if (copyResetTimer.current !== null) {
      window.clearTimeout(copyResetTimer.current);
      copyResetTimer.current = null;
    }

    let sharePath = isSafeSharePath(initialSharePath) ? initialSharePath : `/student/quizzes/${quizId}`;

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
        isSafeSharePath(data.sharePath)
      ) {
        sharePath = data.sharePath;
      }
    } catch {
      // Use the currently known path if the fresh lookup fails.
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

  return (
    <button
      type="button"
      onClick={copyShareLink}
      disabled={disabled}
      title={disabled ? disabledTitle : copied ? "Copied share link" : "Copy share link"}
      className={`eq-action-btn-outline inline-flex h-[48px] min-w-[142px] items-center justify-center gap-2 text-white transition-colors duration-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-70 disabled:hover:bg-slate-100 ${
        copied ? "bg-emerald-600 hover:bg-emerald-600" : "bg-violet-600 hover:bg-violet-700"
      } ${className}`}
      aria-live="polite"
    >
      <span className="relative flex h-4 w-4 items-center justify-center">
        <Share2
          className={`absolute h-4 w-4 transition-all duration-200 ease-out ${
            copied ? "-translate-y-1 rotate-45 scale-75 opacity-0" : "translate-y-0 rotate-0 scale-100 opacity-100"
          }`}
        />
        <Check
          className={`absolute h-4 w-4 transition-all duration-200 ease-out ${
            copied ? "translate-y-0 rotate-0 scale-100 opacity-100" : "translate-y-1 -rotate-45 scale-75 opacity-0"
          }`}
        />
      </span>
      <span className="relative h-5 w-[76px] overflow-hidden">
        <span
          className={`absolute inset-0 flex items-center justify-center whitespace-nowrap transition-all duration-200 ease-out ${
            copied ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          Share Quiz
        </span>
        <span
          className={`absolute inset-0 flex items-center justify-center whitespace-nowrap transition-all duration-200 ease-out ${
            copied ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
          }`}
        >
          Copied!
        </span>
      </span>
      <Copy className={`h-4 w-4 transition-opacity duration-200 ${copied ? "opacity-0" : "opacity-80"}`} />
    </button>
  );
}
