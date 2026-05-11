"use client";

import { useEffect } from "react";
import { CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { hashCode, mulberry32 } from "@/lib/utils";

const DEFAULT_KEYS = ["A", "B", "C", "D"] as const;

const QUESTIONS_PER_PAGE = 20;

interface Question {
  id: string;
  questionText: string;
  options: unknown;
  correctAnswer: string;
  explanation?: string | null;
  order: number;
}

interface Props {
  questions: Question[];
  userAnswers: Record<string, string>;
  currentPage: number;
  onPageChange: (page: number) => void;
  shuffleOptions?: boolean;
  sessionId?: string | null;
  answerLabel?: string;
  emptyMessage?: string;
}

export default function ReviewQuestionsClient({
  questions,
  userAnswers,
  currentPage,
  onPageChange,
  shuffleOptions,
  sessionId,
  answerLabel = "Your answer",
  emptyMessage,
}: Props) {
  const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
  const pageQuestions = questions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE
  );

  // Scroll to top of the scroll area when page changes
  useEffect(() => {
    const scrollArea = document.getElementById("dashboard-scroll-area");
    if (scrollArea) scrollArea.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Question Review</h2>
        {totalPages > 1 && (
          <span className="text-sm text-gray-500 font-medium">
            Page {currentPage + 1} of {totalPages}
          </span>
        )}
      </div>

      {emptyMessage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          {emptyMessage}
        </div>
      )}

      {/* Question cards */}
      {!emptyMessage && pageQuestions.map((q, localIndex) => {
        const globalIndex = currentPage * QUESTIONS_PER_PAGE + localIndex;
        const selected = userAnswers[q.id];
        const isCorrect = selected === q.correctAnswer;
        const isUnattempted = !selected;
        const options = q.options as Record<string, string>;

        return (
          <div
            key={q.id}
            id={`question-${globalIndex}`}
            className={`bg-white rounded-2xl p-4 sm:p-5 space-y-2.5 sm:space-y-3 border shadow-sm ${isCorrect
                ? "border-green-200"
                : isUnattempted
                  ? "border-gray-200"
                  : "border-red-200"
              }`}
          >
            {/* Header */}
            <div className="flex items-start gap-2.5 sm:gap-3">
              <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-gray-100 flex items-center justify-center text-[11px] sm:text-xs font-bold text-gray-700 flex-shrink-0 mt-0.5 sm:mt-0">
                {globalIndex + 1}
              </span>
              <p className="font-medium text-sm sm:text-base text-gray-900 flex-1 leading-snug sm:leading-relaxed whitespace-pre-wrap">
                {q.questionText}
              </p>
              {isCorrect ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : isUnattempted ? (
                <MinusCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
              )}
            </div>

            {/* Options */}
            <div className="pl-9 sm:pl-11 space-y-1.5">
              {(() => {
                const optionKeys = [...DEFAULT_KEYS];
                if (shuffleOptions) {
                  const baseSeed = sessionId ? sessionId : "";
                  const seedStr = baseSeed ? baseSeed + q.id : String(q.id);
                  const rand = mulberry32(Math.abs(hashCode(seedStr)));
                  for (let i = optionKeys.length - 1; i > 0; i--) {
                    const j = Math.floor(rand() * (i + 1));
                    [optionKeys[i], optionKeys[j]] = [optionKeys[j], optionKeys[i]];
                  }
                }
                
                return optionKeys.map((key, i) => {
                  const isCorrectOption = key === q.correctAnswer;
                  const isSelectedOption = key === selected;
                  const displayKey = DEFAULT_KEYS[i];
                  let optionStyle = "bg-white border-gray-100 text-gray-600";
                  if (isCorrectOption)
                    optionStyle = "bg-green-100 border-green-200 text-green-800";
                  else if (isSelectedOption && !isCorrect)
                    optionStyle = "bg-red-100 border-red-200 text-red-800";

                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[13px] sm:text-sm border ${optionStyle}`}
                    >
                      <span
                        className={`w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0 ${isCorrectOption
                            ? "bg-green-200"
                            : isSelectedOption && !isCorrect
                              ? "bg-red-200"
                              : "bg-gray-100"
                          }`}
                      >
                        {displayKey}
                      </span>
                      <span className="font-medium">{options[key]}</span>
                      {isCorrectOption && (
                        <span className="ml-auto text-xs text-green-700 font-bold">
                          ✓ Correct
                        </span>
                      )}
                      {isSelectedOption && !isCorrect && (
                        <span className="ml-auto text-xs text-red-700 font-bold">
                          ✗ {answerLabel}
                        </span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>

            {/* Explanation */}
            {q.explanation && (
              <div className="pl-9 sm:pl-11 mt-2">
                <div className="p-2.5 sm:p-3 rounded-lg sm:rounded-xl bg-blue-50 border border-blue-100 text-[13px] sm:text-sm text-blue-900 whitespace-pre-wrap">
                  <strong className="text-blue-700">Explanation: </strong>
                  {q.explanation}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Pagination — identical style to QuizTaker */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2 pt-2">
          <button
            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-black/10 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
          >
            ← Previous
          </button>
          <span className="text-sm font-medium text-gray-500">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() =>
              onPageChange(Math.min(totalPages - 1, currentPage + 1))
            }
            disabled={currentPage >= totalPages - 1}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-black/10 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
