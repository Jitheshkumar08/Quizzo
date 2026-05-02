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
  const isAnswered = !!selected;

  return (
    <div className={`glass rounded-2xl border transition-all duration-200 ${
      isFlagged ? "border-orange-500/30 bg-orange-50" : "border-black/5 bg-white/50"
    }`}>
      {/* Question header */}
      <div className="flex items-start gap-3 p-5">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${
          isAnswered ? "bg-purple-500 text-white shadow-sm" : "bg-black/5 text-gray-500"
        }`}>
          {index + 1}
        </span>
        <p className={`font-medium flex-1 leading-relaxed ${isAnswered ? "text-gray-900" : "text-gray-700"}`}>
          {question.questionText}
        </p>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onFlag}
            className={`p-1.5 rounded-lg transition-all ${
              isFlagged
                ? "text-orange-500 bg-orange-100"
                : "text-gray-400 hover:text-orange-500 hover:bg-orange-50"
            }`}
            title={isFlagged ? "Remove flag" : "Flag for review"}
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2 px-5 pb-5 pl-[60px]">
        {OPTION_KEYS.map((key) => {
          const isSelected = selected === key;
          return (
            <button
              key={key}
              onClick={() => onAnswer(key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-left transition-all duration-150 border ${
                isSelected
                  ? "bg-purple-50 border-purple-300 text-purple-900 shadow-sm"
                  : "bg-white border-black/5 text-gray-700 hover:bg-gray-50 hover:border-black/10"
              }`}
            >
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 border transition-colors ${
                isSelected
                  ? "bg-purple-500 border-purple-500 text-white shadow-sm"
                  : "bg-gray-100 border-black/5 text-gray-500"
              }`}>
                {key}
              </span>
              <span className="font-medium">{question.options[key]}</span>
            </button>
          );
        })}
        {/* Clear response */}
        {selected && (
          <div className="pt-2">
            <button
              onClick={onClear}
              className="text-xs text-gray-500 hover:text-gray-900 underline transition-colors"
            >
              Clear response
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
