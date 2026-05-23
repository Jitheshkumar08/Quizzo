function SkeletonBlock({
  className,
  delay = "0ms",
}: {
  className: string;
  delay?: string;
}) {
  return (
    <span
      className={`quiz-start-skeleton relative block overflow-hidden ${className}`}
      style={{ "--skeleton-delay": delay } as React.CSSProperties}
    />
  );
}

export default function QuizGateLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-7 animate-fade-in-up py-8 sm:py-12">
      <style>{`
        .quiz-start-skeleton {
          background: linear-gradient(90deg, rgba(242,239,232,0.92), rgba(255,255,255,0.95), rgba(242,239,232,0.92));
          background-size: 220% 100%;
          animation: quiz-start-skeleton 1.35s ease-in-out infinite;
          animation-delay: var(--skeleton-delay);
        }

        .quiz-start-skeleton::after {
          content: "";
          position: absolute;
          inset: 0;
          transform: translateX(-110%);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.62), transparent);
          animation: quiz-start-shimmer 1.8s ease-in-out infinite;
          animation-delay: var(--skeleton-delay);
        }

        @keyframes quiz-start-skeleton {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @keyframes quiz-start-shimmer {
          0% { transform: translateX(-110%); }
          65%, 100% { transform: translateX(110%); }
        }
      `}</style>

      <div className="flex items-center gap-2">
        <SkeletonBlock className="h-4 w-4 rounded-full bg-purple-100" />
        <SkeletonBlock className="h-5 w-32 rounded-lg" delay="80ms" />
      </div>

      <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-white/80 p-6 shadow-[0_22px_60px_rgba(44,42,40,0.10)] ring-1 ring-[#E8E2D8]/80 backdrop-blur-2xl sm:p-8">
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

        <div className="relative z-10 space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 shadow-sm">
                <SkeletonBlock className="h-6 w-6 rounded-md bg-blue-100" />
              </div>

              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
                <div className="h-10 w-[132px] rounded-2xl border border-blue-100 bg-blue-50 p-2 shadow-sm">
                  <SkeletonBlock className="h-full w-full rounded-xl" delay="60ms" />
                </div>
                <div className="h-10 w-[142px] rounded-2xl border border-purple-100 bg-purple-50 p-2 shadow-sm">
                  <SkeletonBlock className="h-full w-full rounded-xl" delay="120ms" />
                </div>
                <div className="h-10 w-[166px] rounded-2xl bg-[#F2EFE8]/90 p-2 shadow-sm">
                  <SkeletonBlock className="h-full w-full rounded-xl" delay="180ms" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <SkeletonBlock className="h-9 w-[78%] rounded-xl" delay="40ms" />
              <SkeletonBlock className="h-9 w-[52%] rounded-xl" delay="110ms" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-5 w-20 rounded-lg" />
            <SkeletonBlock className="h-5 w-36 rounded-lg" delay="90ms" />
          </div>

          <div className="rounded-[24px] border border-[#ECE6DD] bg-[#FFFDF9]/80 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-[#ECE6DD]">
                <SkeletonBlock className="h-5 w-5 rounded-md" />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <SkeletonBlock className="h-3.5 w-28 rounded-md" delay="60ms" />
                <div className="space-y-2">
                  <SkeletonBlock className="h-4 w-[88%] rounded-lg" delay="130ms" />
                  <SkeletonBlock className="h-4 w-[58%] rounded-lg" delay="200ms" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="h-8 w-[150px] rounded-xl border border-amber-200 bg-amber-50 p-1.5">
              <SkeletonBlock className="h-full w-full rounded-lg" delay="60ms" />
            </div>
            <div className="h-8 w-[154px] rounded-xl border border-slate-200 bg-slate-50 p-1.5">
              <SkeletonBlock className="h-full w-full rounded-lg" delay="130ms" />
            </div>
            <div className="h-8 w-[124px] rounded-xl border border-cyan-100 bg-cyan-50 p-1.5">
              <SkeletonBlock className="h-full w-full rounded-lg" delay="200ms" />
            </div>
          </div>

          <div className="rounded-[24px] border border-amber-100 bg-amber-50/45 p-4 sm:p-5">
            <div className="mb-4 flex items-start gap-3">
              <SkeletonBlock className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-md bg-amber-100" />
              <SkeletonBlock className="h-5 w-[82%] rounded-lg" delay="80ms" />
            </div>
            <div className="space-y-3">
              <SkeletonBlock className="h-3.5 w-32 rounded-md" delay="140ms" />
              <SkeletonBlock className="h-14 w-full rounded-2xl bg-white" delay="200ms" />
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-[#ECE6DD] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <SkeletonBlock className="h-5 w-full max-w-[360px] rounded-lg" delay="80ms" />
            <div className="h-[48px] w-full rounded-[0.4em] border-[3px] border-blue-600 bg-blue-50 p-2 shadow-[0.1em_0.1em_#2563eb] sm:w-[164px]">
              <SkeletonBlock className="h-full w-full rounded-md bg-blue-100" delay="160ms" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
