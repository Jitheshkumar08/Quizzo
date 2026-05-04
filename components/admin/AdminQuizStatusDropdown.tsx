"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2 } from "lucide-react";

const STATUS_OPTIONS = [
  { value: true, label: "Published" },
  { value: false, label: "Draft" },
] as const;

const statusConfig = {
  published: {
    pill: "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-200",
    dot: "bg-white/70",
    hover: "hover:bg-emerald-50 hover:text-emerald-700",
    check: "text-emerald-600",
    gradient: "from-emerald-500 to-green-600",
  },
  draft: {
    pill: "bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-amber-200",
    dot: "bg-white/70",
    hover: "hover:bg-amber-50 hover:text-amber-700",
    check: "text-amber-600",
    gradient: "from-amber-400 to-orange-500",
  },
};

function keyForStatus(published: boolean) {
  return published ? "published" : "draft";
}

export default function AdminQuizStatusDropdown({
  quizId,
  initialPublished,
}: {
  quizId: string;
  initialPublished: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [published, setPublished] = useState(initialPublished);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function updateStatus(nextPublished: boolean) {
    setOpen(false);
    if (nextPublished === published || saving) return;

    const previous = published;
    setPublished(nextPublished);
    setSaving(true);

    try {
      const res = await fetch(`/api/quiz/${encodeURIComponent(quizId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isPublished: nextPublished }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setPublished(previous);
        alert(typeof data.error === "string" ? data.error : "Could not update quiz status");
        return;
      }

      setPublished(Boolean(data.isPublished));
      router.refresh();
    } catch {
      setPublished(previous);
      alert("Network error while updating quiz status");
    } finally {
      setSaving(false);
    }
  }

  const current = keyForStatus(published);
  const cfg = statusConfig[current];

  if (saving) {
    return (
      <div className={`inline-flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-full font-bold shadow-sm ${cfg.pill}`}>
        <Loader2 className="w-3 h-3 animate-spin" />
        Saving...
      </div>
    );
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full font-bold tracking-wide shadow-sm transition-all duration-150 hover:brightness-110 active:scale-95 ${cfg.pill}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
        {published ? "Published" : "Draft"}
        <ChevronDown className={`w-3 h-3 ml-0.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-40 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E8E2D9] py-1.5 overflow-hidden">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#B0A89E] px-3 pt-1.5 pb-2">Quiz Status</p>
          {STATUS_OPTIONS.map((option) => {
            const optionKey = keyForStatus(option.value);
            const optionCfg = statusConfig[optionKey];
            const isActive = option.value === published;

            return (
              <button
                key={option.label}
                type="button"
                onClick={() => updateStatus(option.value)}
                className={`w-full flex items-center justify-between px-3 py-2 text-[12px] font-bold transition-colors duration-100 ${
                  isActive
                    ? "bg-[#F5EDE2] text-[#2C2A28]"
                    : `text-[#4A4744] ${optionCfg.hover}`
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full bg-gradient-to-br ${optionCfg.gradient}`} />
                  {option.label}
                </span>
                {isActive && <Check className={`w-3.5 h-3.5 ${optionCfg.check}`} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
