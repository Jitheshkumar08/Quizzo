"use client";

import { useEffect, useState } from "react";

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
}

export default function LearnQuestionsClient({ questions }: Props) {
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE);
  const pageQuestions = questions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE
  );

  useEffect(() => {
    const scrollArea = document.getElementById("dashboard-scroll-area");
    if (scrollArea) scrollArea.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">All Questions</h2>
        {totalPages > 1 && (
          <span className="text-sm text-gray-500 font-medium">
            Page {currentPage + 1} of {totalPages}
          </span>
        )}
      </div>

      {pageQuestions.map((q, localIndex) => {
        const globalIndex = currentPage * QUESTIONS_PER_PAGE + localIndex;
        const options = q.options as Record<string, string>;

        return (
          <div
            key={q.id}
            id={`question-${globalIndex}`}
            className="bg-white rounded-2xl p-4 sm:p-5 space-y-2.5 sm:space-y-3 border border-gray-200 shadow-sm"
          >
            {/* Header */}
            <div className="flex items-start gap-2.5 sm:gap-3">
              <span className="w-6 h-6 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-gray-100 flex items-center justify-center text-[11px] sm:text-xs font-bold text-gray-700 flex-shrink-0 mt-0.5 sm:mt-0">
                {globalIndex + 1}
              </span>
              <p className="font-medium text-sm sm:text-base text-gray-900 flex-1 leading-snug sm:leading-relaxed whitespace-pre-wrap">
                {q.questionText}
              </p>
            </div>

            {/* Options */}
            <div className="pl-9 sm:pl-11 space-y-1.5">
              {DEFAULT_KEYS.map((key) => {
                const isCorrect = key === q.correctAnswer;
                const optionStyle = isCorrect
                  ? "bg-green-100 border-green-200 text-green-800"
                  : "bg-white border-gray-100 text-gray-600";
                const badgeStyle = isCorrect ? "bg-green-200" : "bg-gray-100";

                return (
                  <div
                    key={key}
                    className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[13px] sm:text-sm border ${optionStyle}`}
                  >
                    <span
                      className={`w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center text-[10px] sm:text-xs font-bold flex-shrink-0 ${badgeStyle}`}
                    >
                      {key}
                    </span>
                    <span className="font-medium">{options[key]}</span>
                    {isCorrect && (
                      <span className="ml-auto text-xs text-green-700 font-bold">
                        ✓ Correct
                      </span>
                    )}
                  </div>
                );
              })}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-2 pt-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-white border border-black/10 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-colors"
          >
            ← Previous
          </button>
          <span className="text-sm font-medium text-gray-500">
            Page {currentPage + 1} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
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
