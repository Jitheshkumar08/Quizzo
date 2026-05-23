"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Share2 } from "lucide-react";

function isSafeSharePath(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

export default function QuizShareButton({
  quizId,
  initialSharePath,
  disabled = false,
  disabledTitle = "Publish quiz to share",
  compact = false,
  className = "",
}: {
  quizId: string;
  initialSharePath?: string | null;
  disabled?: boolean;
  disabledTitle?: string;
  compact?: boolean;
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

  /* ── Compact variant (student quiz cards — sits next to START →) ────── */
  if (compact) {
    return (
      <button
        type="button"
        onClick={copyShareLink}
        disabled={disabled}
        title={disabled ? disabledTitle : copied ? "Copied share link" : "Copy share link"}
        className={`group/share relative inline-flex items-center justify-center py-2 px-4 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${
          copied
            ? "bg-[#dcfce7] text-[#15803d]"
            : "bg-[#dfceff] text-[#6a32db] hover:brightness-95"
        } disabled:bg-slate-100 disabled:text-slate-400 disabled:hover:brightness-100 disabled:cursor-not-allowed h-[42px] min-w-[108px] rounded-[20px] cursor-pointer ${className}`}
        aria-live="polite"
      >
        {/* Icon */}
        <span className="relative z-10 flex h-4 w-4 items-center justify-center mr-2">
          <Share2
            className={`absolute h-[14px] w-[14px] transition-all duration-250 ease-out ${
              copied
                ? "-translate-y-2 rotate-45 scale-50 opacity-0"
                : "translate-y-0 rotate-0 scale-100 opacity-100"
            }`}
          />
          <Check
            className={`absolute h-[14px] w-[14px] transition-all duration-250 ease-out ${
              copied
                ? "translate-y-0 rotate-0 scale-100 opacity-100"
                : "translate-y-2 -rotate-45 scale-50 opacity-0"
            }`}
          />
        </span>

        {/* Label */}
        <span className="relative z-10 h-4 w-[64px] overflow-hidden">
          <span
            className={`absolute inset-0 flex items-center whitespace-nowrap font-bold text-sm tracking-[0.05em] uppercase transition-all duration-250 ease-out ${
              copied
                ? "-translate-y-full opacity-0"
                : "translate-y-0 opacity-100"
            }`}
          >
            Share
          </span>
          <span
            className={`absolute inset-0 flex items-center whitespace-nowrap font-bold text-sm tracking-[0.05em] uppercase transition-all duration-250 ease-out ${
              copied
                ? "translate-y-0 opacity-100"
                : "translate-y-full opacity-0"
            }`}
          >
            Copied!
          </span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={copyShareLink}
      disabled={disabled}
      title={disabled ? disabledTitle : copied ? "Copied share link" : "Copy share link"}
      className={`group/share inline-flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.96] disabled:opacity-50 disabled:active:scale-100 eq-action-btn-outline h-[42px] min-w-[120px] cursor-pointer ${
          copied
            ? "bg-emerald-50 text-emerald-700 !border-emerald-600"
            : "bg-violet-50 text-violet-700 !border-violet-700 hover:bg-violet-100 hover:text-violet-800"
      } disabled:bg-slate-50 disabled:text-slate-400 disabled:!border-slate-300 disabled:cursor-not-allowed ${className}`}
      aria-live="polite"
    >
      {/* Icon */}
      <span className="relative flex h-4 w-4 items-center justify-center">
        <Share2
          className={`absolute h-4 w-4 transition-all duration-250 ease-out ${
            copied
              ? "-translate-y-1.5 rotate-45 scale-75 opacity-0"
              : "translate-y-0 rotate-0 scale-100 opacity-100"
          }`}
        />
        <Check
          className={`absolute h-4 w-4 transition-all duration-250 ease-out ${
            copied
              ? "translate-y-0 rotate-0 scale-100 opacity-100"
              : "translate-y-1.5 -rotate-45 scale-75 opacity-0"
          }`}
        />
      </span>

      {/* Label */}
      <span className="relative h-5 w-[64px] overflow-hidden">
        <span
          className={`absolute inset-0 flex items-center justify-center whitespace-nowrap transition-all duration-250 ease-out ${
            copied ? "-translate-y-full opacity-0" : "translate-y-0 opacity-100"
          }`}
        >
          Share
        </span>
        <span
          className={`absolute inset-0 flex items-center justify-center whitespace-nowrap transition-all duration-250 ease-out ${
            copied ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
          }`}
        >
          Copied!
        </span>
      </span>
    </button>
  );
}
