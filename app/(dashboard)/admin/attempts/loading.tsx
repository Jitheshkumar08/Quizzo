import { BarChart3 } from "lucide-react";

export default function AdminAttemptsLoading() {
  return (
    <div className="space-y-6 animate-fade-in-up" aria-label="Loading all attempts">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <div className="attempts-skeleton h-7 w-40 rounded-full" />
          <div className="attempts-skeleton mt-2 h-4 w-72 max-w-[70vw] rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-center">
            <div className="attempts-skeleton mx-auto h-7 w-12 rounded-full" />
            <div className="attempts-skeleton mx-auto mt-3 h-3 w-24 rounded-full" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
        <div className="grid min-w-[980px] grid-cols-[1.15fr_1.35fr_0.7fr_0.8fr_1.1fr_0.8fr] gap-4 bg-slate-50/90 px-5 py-4 border-b border-slate-200">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="attempts-skeleton h-4 rounded-full" />
          ))}
        </div>

        {[0, 1, 2, 3, 4].map((row) => (
          <div
            key={row}
            className="grid min-w-[980px] grid-cols-[1.15fr_1.35fr_0.7fr_0.8fr_1.1fr_0.8fr] gap-4 items-center px-5 py-4 border-b border-slate-100 last:border-b-0"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="attempts-skeleton h-10 w-10 rounded-2xl flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="attempts-skeleton h-4 w-28 rounded-full" />
                <div className="attempts-skeleton h-3 w-20 rounded-full" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="attempts-skeleton h-4 w-36 rounded-full" />
              <div className="attempts-skeleton h-3 w-24 rounded-full" />
            </div>
            <div className="flex items-center gap-2">
              <div className="attempts-skeleton h-7 w-14 rounded-full" />
              <div className="attempts-skeleton h-4 w-10 rounded-full" />
            </div>
            <div className="attempts-skeleton h-4 w-16 rounded-full" />
            <div className="attempts-skeleton h-4 w-32 rounded-full" />
            <div className="attempts-skeleton ml-auto h-11 w-28 rounded-xl" />
          </div>
        ))}
      </div>

      <style>{`
        .attempts-skeleton {
          position: relative;
          overflow: hidden;
          background: linear-gradient(90deg, #f1f5f9 0%, #ffffff 45%, #f1f5f9 100%);
          background-size: 220% 100%;
          animation: attempts-skeleton-shimmer 1.35s ease-in-out infinite;
        }

        @keyframes attempts-skeleton-shimmer {
          0% { background-position: 120% 0; }
          100% { background-position: -120% 0; }
        }
      `}</style>
    </div>
  );
}
