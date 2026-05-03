export default function AdminQuizzesLoading() {
  return (
    <div className="space-y-6 animate-fade-in-up w-full">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-[180px] bg-black/10 rounded-xl animate-pulse"></div>
          <div className="h-4 w-[120px] bg-black/5 rounded-lg animate-pulse mt-3"></div>
        </div>
      </div>

      {/* Quiz List Rows Skeleton */}
      <div className="grid gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="glass rounded-2xl p-5 flex items-start gap-4 relative overflow-hidden">
            {/* Shimmer effect overlay */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent z-0"></div>

            {/* Icon Skeleton */}
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 animate-pulse flex-shrink-0 relative z-10"></div>

            {/* Info Skeleton */}
            <div className="flex-1 min-w-0 space-y-3 relative z-10">
              <div className="flex items-start gap-3">
                <div className="h-6 w-[200px] bg-black/10 rounded-md animate-pulse"></div>
                <div className="h-5 w-16 bg-green-400/20 rounded-full animate-pulse"></div>
              </div>
              
              <div className="h-4 w-[60%] bg-black/5 rounded-md animate-pulse"></div>

              {/* Stats Skeleton */}
              <div className="flex items-center gap-4 mt-3">
                <div className="h-4 w-20 bg-black/5 rounded-md animate-pulse"></div>
                <div className="h-4 w-20 bg-black/5 rounded-md animate-pulse"></div>
                <div className="h-4 w-24 bg-black/5 rounded-md animate-pulse"></div>
              </div>
            </div>

            {/* Actions Skeleton */}
            <div className="flex items-center gap-2 flex-shrink-0 relative z-10">
              <div className="w-8 h-8 rounded-lg bg-black/5 animate-pulse"></div>
              <div className="w-[52px] h-[32px] rounded-lg bg-black/5 animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
