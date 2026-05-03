export default function StudentResultsLoading() {
  return (
    <div className="space-y-6 animate-fade-in-up w-full">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-[150px] bg-black/10 rounded-xl animate-pulse"></div>
          <div className="h-4 w-[250px] bg-black/5 rounded-lg animate-pulse mt-3"></div>
        </div>
      </div>

      {/* Results List Rows Skeleton */}
      <div className="grid gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-[28px] p-6 relative overflow-hidden">
            {/* Shimmer effect overlay */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-black/[0.02] to-transparent z-0"></div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              <div className="space-y-4 flex-1">
                {/* Date Skeleton */}
                <div className="h-4 w-[140px] bg-black/5 rounded-md animate-pulse"></div>
                
                {/* Title Skeleton */}
                <div className="h-7 w-[80%] max-w-[400px] bg-black/10 rounded-lg animate-pulse"></div>
                
                {/* Stats Box Skeleton */}
                <div className="bg-gray-50 rounded-2xl p-4 inline-flex flex-wrap gap-6 border border-gray-100/50 mt-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-black/5 animate-pulse"></div>
                    <div className="space-y-1.5">
                      <div className="h-3 w-12 bg-black/5 rounded-sm animate-pulse"></div>
                      <div className="h-4 w-16 bg-black/10 rounded-md animate-pulse"></div>
                    </div>
                  </div>
                  <div className="w-px bg-gray-200"></div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-black/5 animate-pulse"></div>
                    <div className="space-y-1.5">
                      <div className="h-3 w-12 bg-black/5 rounded-sm animate-pulse"></div>
                      <div className="h-4 w-16 bg-black/10 rounded-md animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Score & Button Skeleton */}
              <div className="flex items-center gap-4 border-t md:border-t-0 pt-4 md:pt-0">
                <div className="w-14 h-14 rounded-full bg-purple-500/10 animate-pulse"></div>
                <div className="w-[150px] h-[48px] rounded-full bg-blue-500/10 animate-pulse"></div>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
