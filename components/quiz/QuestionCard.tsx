"use client";

import { Flag } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { hashCode, mulberry32 } from "@/lib/utils";

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
  shuffleOptions?: boolean;
  attemptStartedAt?: string | null;
  sessionId?: string | null;
  onViewed?: () => void;
  onAnswer: (key: string) => void;
  onClear: () => void;
  onFlag: () => void;
}

const DEFAULT_KEYS = ["A", "B", "C", "D"] as const;

export default function QuestionCard({
  question,
  index,
  selected,
  isFlagged,
  shuffleOptions,
  attemptStartedAt,
  sessionId,
  onViewed,
  onAnswer,
  onClear,
  onFlag,
}: QuestionCardProps) {
  const isAnswered = !!selected;

  const optionKeys = useMemo(() => {
    if (shuffleOptions) {
      const baseSeed = sessionId ? sessionId : (attemptStartedAt ? attemptStartedAt : "");
      const seedStr = baseSeed ? baseSeed + question.id : question.id;
      const rand = mulberry32(Math.abs(hashCode(seedStr)));
      const keys = [...DEFAULT_KEYS];
      for (let i = keys.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [keys[i], keys[j]] = [keys[j], keys[i]];
      }
      return keys;
    }
    return [...DEFAULT_KEYS];
  }, [shuffleOptions, attemptStartedAt, sessionId, question.id]);

  useEffect(() => {
    onViewed?.();
  }, [onViewed, question.id]);

  return (
    <div
      id={`question-${index}`}
      className={`glass rounded-2xl border transition-all duration-200 ${isFlagged ? "border-orange-500/30 bg-orange-50" : "border-black/5 bg-white/50"
        }`}>
      {/* Question header */}
      <div className="flex items-start gap-2.5 sm:gap-3 p-3 sm:p-5 pb-2 sm:pb-5">
        <span className={`w-6 h-6 sm:w-8 sm:h-8 mt-0.5 sm:mt-0 rounded-md sm:rounded-lg flex items-center justify-center text-[11px] sm:text-sm font-bold flex-shrink-0 transition-colors ${isAnswered ? "bg-purple-500 text-white shadow-sm" : "bg-black/5 text-gray-500"
          }`}>
          {index + 1}
        </span>
        <p className={`text-sm sm:text-base font-medium flex-1 leading-snug sm:leading-relaxed ${isAnswered ? "text-gray-900" : "text-gray-700"}`}>
          {question.questionText}
        </p>
        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5 sm:mt-0">
          <button
            onClick={onFlag}
            className={`p-1.5 rounded-lg transition-all ${isFlagged
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
      <div className="space-y-1.5 sm:space-y-2 px-3 sm:px-5 pb-4 sm:pb-5 pl-11 sm:pl-[60px]">
        {optionKeys.map((key, i) => {
          const isSelected = selected === key;
          const displayKey = DEFAULT_KEYS[i];
          const letterStr = key as "A" | "B" | "C" | "D";
          return (
            <button
              key={key}
              onClick={() => onAnswer(key)}
              className={`w-full flex items-center gap-2.5 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-[13px] sm:text-sm text-left transition-all duration-150 border ${isSelected
                ? "bg-purple-50 border-purple-300 text-purple-900 shadow-sm"
                : "bg-white border-black/5 text-gray-700 hover:bg-gray-50 hover:border-black/10"
                }`}
            >
              <span className={`w-6 h-6 sm:w-7 sm:h-7 rounded-md sm:rounded-lg flex items-center justify-center text-[11px] sm:text-xs font-bold flex-shrink-0 border transition-colors ${isSelected
                ? "bg-purple-500 border-purple-500 text-white shadow-sm"
                : "bg-gray-100 border-black/5 text-gray-500"
                }`}>
                {displayKey}
              </span>
              <span className="font-medium">{question.options[letterStr]}</span>
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
