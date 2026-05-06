"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.3Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-0.9 6.6-2.5L15.4 17c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.8a6 6 0 0 1 0-3.6V7.6H3.1a10 10 0 0 0 0 8.8l3.3-2.6Z" />
      <path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.9-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-8.9 5.6l3.3 2.6C7.2 7.9 9.4 6.1 12 6.1Z" />
    </svg>
  );
}

export default function GoogleAuthButton({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disabled = loading || !enabled;

  useEffect(() => {
    function clearLoadingOnReturn() {
      setLoading(false);
    }
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") clearLoadingOnReturn();
    }

    window.addEventListener("focus", clearLoadingOnReturn);
    window.addEventListener("pageshow", clearLoadingOnReturn);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", clearLoadingOnReturn);
      window.removeEventListener("pageshow", clearLoadingOnReturn);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
    };
  }, []);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!enabled) return;
        setLoading(true);

        // If navigation is cancelled (user closes picker / goes back), reset the CTA.
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => setLoading(false), 12000);

        void signIn("google", { callbackUrl: "/dashboard" })
          .catch(() => setLoading(false));
      }}
      className="group cursor-pointer relative flex w-full items-center justify-center gap-3 rounded-full border border-[#E5DED3] bg-white px-5 py-4 text-[15px] font-black text-[#2C2A28] shadow-[0_10px_24px_rgba(44,42,40,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D8CEC0] hover:shadow-[0_14px_30px_rgba(44,42,40,0.13)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <span className="absolute -top-3 right-5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-700 shadow-sm">
        Recommended
      </span>
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-[#918B80]" /> : <GoogleMark />}
      <span>{loading ? "Opening Google..." : enabled ? label : "Google setup needed"}</span>
    </button>
  );
}
