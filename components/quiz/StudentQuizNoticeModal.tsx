"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";

interface StudentQuizNoticeModalProps {
  notice?: string;
}

export default function StudentQuizNoticeModal({ notice }: StudentQuizNoticeModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(notice === "updated");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-[#1F1B19]/78 p-4 backdrop-blur-lg animate-in fade-in duration-200">
      <div className="relative w-full max-w-[430px] overflow-hidden rounded-[34px] border border-white/95 bg-[#FFFDF9] p-7 text-center shadow-[0_34px_110px_rgba(0,0,0,0.46),0_0_0_1px_rgba(31,27,25,0.08)]">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-amber-100/80 to-transparent" />
        <div className="absolute -right-14 -top-16 h-36 w-36 rounded-full bg-amber-100 blur-3xl" />
        <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] bg-amber-100 text-amber-700 shadow-[0_12px_28px_rgba(180,83,9,0.16)] ring-1 ring-amber-200">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <div className="relative space-y-2">
          <h2 className="text-2xl font-black tracking-tight text-[#1F1B19]">Quiz updated</h2>
          <p className="mx-auto max-w-sm text-sm font-semibold leading-relaxed text-[#6B6357]">
            This quiz was changed while you were taking it. Your current attempt was stopped and you were moved back to Browse Quizzes.
          </p>
          <p className="mx-auto max-w-sm text-xs font-bold leading-relaxed text-[#918B80]">
            Start the quiz again from this page to use the latest version.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            router.replace("/student/quizzes", { scroll: false });
          }}
          className="relative mt-6 inline-flex w-full items-center justify-center rounded-[18px] bg-[#1F1B19] px-5 py-3.5 text-sm font-black text-white shadow-[0_14px_30px_rgba(31,27,25,0.24)] transition-colors hover:bg-[#14110F]"
        >
          OK
        </button>
      </div>
    </div>
  );
}
