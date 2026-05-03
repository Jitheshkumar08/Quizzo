export default function StudentQuizzesLoading() {
  return (
    <div className="space-y-6 animate-fade-in-up w-full">
      {/* Header Skeleton */}
      <div>
        <div className="h-8 w-[200px] bg-black/10 rounded-xl animate-pulse"></div>
        <div className="h-4 w-[150px] bg-black/5 rounded-lg animate-pulse mt-3"></div>
      </div>

      {/* Quiz Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-3xl p-6 space-y-5 flex flex-col border border-black/5 bg-white shadow-sm"
          >
            {/* Shimmer effect overlay */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-black/[0.03] to-transparent z-0"></div>

            {/* Header: Icon & Badge Skeleton */}
            <div className="flex items-start justify-between relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 animate-pulse"></div>
              <div className="w-16 h-6 rounded-full bg-purple-100/50 animate-pulse"></div>
            </div>

            {/* Content: Tags, Title, Description Skeleton */}
            <div className="flex-1 relative z-10 space-y-3">
              <div className="flex gap-1.5 mb-2">
                <div className="w-14 h-5 rounded-md bg-slate-100 animate-pulse"></div>
                <div className="w-16 h-5 rounded-md bg-slate-100 animate-pulse"></div>
              </div>
              
              <div className="space-y-2">
                <div className="h-5 w-[85%] bg-black/10 rounded-md animate-pulse"></div>
                <div className="h-5 w-[60%] bg-black/10 rounded-md animate-pulse"></div>
              </div>

              <div className="space-y-2 mt-4">
                <div className="h-3 w-full bg-black/5 rounded-md animate-pulse"></div>
                <div className="h-3 w-full bg-black/5 rounded-md animate-pulse"></div>
                <div className="h-3 w-[70%] bg-black/5 rounded-md animate-pulse"></div>
              </div>
            </div>

            {/* Stats & Footer Skeleton */}
            <div className="pt-5 border-t border-gray-100 relative z-10 mt-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-6 bg-gray-100 rounded-lg animate-pulse"></div>
                <div className="w-16 h-6 bg-gray-100 rounded-lg animate-pulse"></div>
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="w-24 h-4 bg-gray-100 rounded-md animate-pulse"></div>
                <div className="w-20 h-8 bg-purple-100/30 rounded-lg animate-pulse"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
