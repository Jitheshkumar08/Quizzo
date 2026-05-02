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
    answered: "bg-blue-500 text-white border-blue-600 shadow-sm",
    flagged: "bg-orange-500 text-white border-orange-600 shadow-sm",
    skipped: "bg-red-500/80 text-white border-red-600 shadow-sm",
    notVisited: "bg-gray-100 text-gray-500 border-black/5",
    current: "bg-purple-500 text-white border-purple-600 shadow-sm",
  };

  const stats = {
    answered: questions.filter((q) => answers[q.id] && !flagged.has(q.id)).length,
    flagged: questions.filter((q) => flagged.has(q.id)).length,
    skipped: questions.filter((q) => visited.has(q.id) && !answers[q.id] && !flagged.has(q.id)).length,
    notVisited: questions.filter((q) => !visited.has(q.id)).length,
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Questions</h3>

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
                isOnCurrentPage ? "ring-2 ring-purple-500/30 ring-offset-1" : "hover:brightness-95"
              }`}
              title={`Question ${i + 1}: ${status}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="space-y-1.5 pt-4 border-t border-gray-100">
        {[
          { color: "bg-blue-500", label: `Answered (${stats.answered})` },
          { color: "bg-orange-500", label: `Flagged (${stats.flagged})` },
          { color: "bg-red-500/80", label: `Skipped (${stats.skipped})` },
          { color: "bg-gray-200", label: `Not visited (${stats.notVisited})` },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-sm flex-shrink-0 ${color} shadow-sm border border-black/5`} />
            <span className="text-xs text-gray-500 font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
