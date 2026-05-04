import { ArrowLeft } from "lucide-react";

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-full bg-[#E8E2D8]/80 ${className}`} />;
}

function StatSkeleton({ tone }: { tone: "sky" | "violet" | "stone" }) {
  const shell =
    tone === "sky"
      ? "border-sky-100 bg-sky-50/70"
      : tone === "violet"
        ? "border-violet-100 bg-violet-50/70"
        : "border-[#E8E2D8] bg-white/75";

  return (
    <div className={`rounded-[24px] border ${shell} p-5 shadow-sm`}>
      <SkeletonBlock className="h-6 w-6 rounded-lg" />
      <SkeletonBlock className="mt-4 h-3 w-20" />
      <SkeletonBlock className="mt-3 h-8 w-12" />
    </div>
  );
}

export default function AdminUserProfileLoading() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="inline-flex items-center gap-2 text-sm font-bold text-[#6B6357]">
        <ArrowLeft className="w-4 h-4" />
        Back to Users
      </div>

      <div className="rounded-[28px] border border-[#E8E2D8] bg-white/70 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="p-6 sm:p-8 bg-gradient-to-br from-[#FFFDF9] via-white to-[#F4EFE6] border-b border-[#E8E2D8]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4 min-w-0">
              <SkeletonBlock className="h-16 w-16 rounded-3xl" />
              <div className="min-w-0">
                <SkeletonBlock className="h-8 w-56 max-w-full" />
                <SkeletonBlock className="mt-3 h-4 w-36" />
              </div>
            </div>
            <SkeletonBlock className="h-9 w-32 rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-5 p-5 sm:p-6">
          <div className="rounded-[24px] border border-[#E8E2D8] bg-white/75 p-5 sm:p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <SkeletonBlock className="h-10 w-10 rounded-2xl" />
              <div>
                <SkeletonBlock className="h-5 w-40" />
                <SkeletonBlock className="mt-2 h-3 w-48" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[0, 1].map((item) => (
                <div key={item} className="space-y-2">
                  <SkeletonBlock className="h-3 w-24" />
                  <SkeletonBlock className="h-12 w-full rounded-2xl" />
                </div>
              ))}

              <div className="space-y-2 sm:col-span-2">
                <SkeletonBlock className="h-3 w-16" />
                <SkeletonBlock className="h-12 w-full rounded-2xl" />
              </div>

              {[0, 1].map((item) => (
                <div key={item} className="space-y-2">
                  <SkeletonBlock className="h-3 w-28" />
                  <SkeletonBlock className="h-12 w-full rounded-2xl" />
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <SkeletonBlock className="h-11 w-40 rounded-full" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <StatSkeleton tone="sky" />
            <StatSkeleton tone="violet" />
            <StatSkeleton tone="stone" />
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-[#E8E2D8] bg-[#F4EFE6]/70 p-5 flex items-start gap-3">
        <SkeletonBlock className="h-5 w-5 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonBlock className="h-3 w-full" />
          <SkeletonBlock className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  );
}
