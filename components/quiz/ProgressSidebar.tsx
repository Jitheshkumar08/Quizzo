"use client";

interface Question {
  id: string;
  order: number;
}

interface ProgressSidebarProps {
  questions: Question[];
  answers: Record<string, string>;
  flagged: Set<string>;
  visited: Set<string>;
  currentPage: number;
  questionsPerPage: number;
  onJump: (index: number) => void;
}

export default function ProgressSidebar({
  questions,
  answers,
  flagged,
  visited,
  currentPage,
  questionsPerPage,
  onJump,
}: ProgressSidebarProps) {
  function getStatus(q: Question): "answered" | "flagged" | "skipped" | "notVisited" | "current" {
    const isCurrentPage =
      Math.floor(q.order / questionsPerPage) === currentPage;
    if (flagged.has(q.id)) return "flagged";
    if (answers[q.id]) return "answered";
    if (visited.has(q.id)) return "skipped";
    return "notVisited";
  }

  const statusStyles: Record<string, string> = {
    answered: "bg-blue-500 text-white border-blue-600",
    flagged: "bg-orange-500 text-white border-orange-600",
    skipped: "bg-red-500/70 text-white border-red-600",
    notVisited: "bg-white/5 text-muted-foreground border-white/10",
    current: "bg-purple-500 text-white border-purple-600",
  };

  const stats = {
    answered: questions.filter((q) => answers[q.id] && !flagged.has(q.id)).length,
    flagged: questions.filter((q) => flagged.has(q.id)).length,
    skipped: questions.filter((q) => visited.has(q.id) && !answers[q.id] && !flagged.has(q.id)).length,
    notVisited: questions.filter((q) => !visited.has(q.id)).length,
  };

  return (
    <div className="w-52 flex-shrink-0">
      <div className="glass rounded-2xl p-4 space-y-4 sticky top-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Questions</h3>

        {/* Grid */}
        <div className="grid grid-cols-5 gap-1.5">
          {questions.map((q, i) => {
            const status = getStatus(q);
            const isOnCurrentPage = Math.floor(i / questionsPerPage) === currentPage;
            return (
              <button
                key={q.id}
                onClick={() => onJump(i)}
                className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all duration-150 ${statusStyles[status]} ${
                  isOnCurrentPage ? "ring-2 ring-white/30" : ""
                }`}
                title={`Question ${i + 1}: ${status}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="space-y-1.5 pt-2 border-t border-white/5">
          {[
            { color: "bg-blue-500", label: `Answered (${stats.answered})` },
            { color: "bg-orange-500", label: `Flagged (${stats.flagged})` },
            { color: "bg-red-500/70", label: `Skipped (${stats.skipped})` },
            { color: "bg-white/10", label: `Not visited (${stats.notVisited})` },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-sm flex-shrink-0 ${color}`} />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
