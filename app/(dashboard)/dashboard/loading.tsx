export default function DashboardLoading() {
  return (
    <div className="space-y-10 animate-fade-in-up w-full">
      {/* Greeting Skeleton */}
      <div className="space-y-3">
        <div className="h-10 w-[350px] bg-black/5 rounded-xl animate-pulse"></div>
        <div className="h-5 w-[250px] bg-black/5 rounded-lg animate-pulse mt-2"></div>
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white/60 backdrop-blur-xl border border-white/80 rounded-[24px] p-7 flex flex-col gap-4 relative overflow-hidden shadow-[0_4px_12px_rgba(163,149,126,0.04)]"
          >
            {/* Shimmer effect overlay */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
            
            {/* Icon Block Skeleton */}
            <div className="w-12 h-12 rounded-[16px] bg-black/5 animate-pulse flex-shrink-0"></div>
            
            <div className="flex-1 mt-2 space-y-4">
              {/* Title & Arrow Skeleton */}
              <div className="flex items-center justify-between">
                <div className="h-6 w-[120px] bg-black/10 rounded-lg animate-pulse"></div>
                <div className="w-5 h-5 rounded-md bg-black/5 animate-pulse"></div>
              </div>
              
              {/* Description Lines Skeleton */}
              <div className="space-y-2">
                <div className="h-3 w-full bg-black/5 rounded-md animate-pulse"></div>
                <div className="h-3 w-[80%] bg-black/5 rounded-md animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
