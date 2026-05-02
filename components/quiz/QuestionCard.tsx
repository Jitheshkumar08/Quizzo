"use client";

import { Flag } from "lucide-react";

interface Question {
  id: string;
  questionText: string;
  options: { A: string; B: string; C: string; D: string };
}

interface QuestionCardProps {
  question: Question;
  index: number;
  selected: string | null;
  isFlagged: boolean;
  onAnswer: (key: string) => void;
  onClear: () => void;
  onFlag: () => void;
}

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

export default function QuestionCard({
  question,
  index,
  selected,
  isFlagged,
  onAnswer,
  onClear,
  onFlag,
}: QuestionCardProps) {
  return (
    <div className={`glass rounded-2xl p-5 space-y-4 border transition-all duration-200 ${
      isFlagged ? "border-orange-500/30 bg-orange-500/3" : "border-white/5"
    }`}>
      {/* Question header */}
      <div className="flex items-start gap-3">
        <span className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400 text-sm font-bold flex-shrink-0">
          {index + 1}
        </span>
        <p className="font-medium text-foreground flex-1 leading-relaxed">{question.questionText}</p>
        <button
          onClick={onFlag}
          className={`p-1.5 rounded-lg transition-all flex-shrink-0 ${
            isFlagged
              ? "text-orange-400 bg-orange-400/15"
              : "text-muted-foreground hover:text-orange-400 hover:bg-orange-400/10"
          }`}
          title={isFlagged ? "Remove flag" : "Flag for review"}
        >
          <Flag className="w-4 h-4" />
        </button>
      </div>

      {/* Options */}
      <div className="space-y-2 pl-11">
        {OPTION_KEYS.map((key) => {
          const isSelected = selected === key;
          return (
            <button
              key={key}
              onClick={() => onAnswer(key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all duration-150 border ${
                isSelected
                  ? "bg-purple-500/15 border-purple-500/40 text-purple-200"
                  : "bg-white/3 border-white/5 text-foreground hover:bg-white/6 hover:border-white/15"
              }`}
            >
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 border transition-colors ${
                isSelected
                  ? "bg-purple-500 border-purple-500 text-white"
                  : "bg-white/5 border-white/10"
              }`}>
                {key}
              </span>
              <span>{question.options[key]}</span>
            </button>
          );
        })}
      </div>

      {/* Clear response */}
      {selected && (
        <div className="pl-11">
          <button
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
          >
            Clear response
          </button>
        </div>
      )}
    </div>
  );
}
