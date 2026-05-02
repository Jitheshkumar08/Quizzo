"use client";

import { useState, useEffect } from "react";
import { Trash2, Plus, Check, ChevronDown, ChevronUp } from "lucide-react";

export interface QuestionData {
  id?: string;
  questionText: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  order: number;
}

interface QuestionEditorProps {
  question: QuestionData;
  index: number;
  globalCollapsed?: boolean;
  onChange: (index: number, updated: QuestionData) => void;
  onDelete: (index: number) => void;
}

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

export default function QuestionEditor({ question, index, globalCollapsed, onChange, onDelete }: QuestionEditorProps) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (globalCollapsed !== undefined) {
      setCollapsed(globalCollapsed);
    }
  }, [globalCollapsed]);

  function update(patch: Partial<QuestionData>) {
    onChange(index, { ...question, ...patch });
  }

  function updateOption(key: "A" | "B" | "C" | "D", value: string) {
    onChange(index, {
      ...question,
      options: { ...question.options, [key]: value },
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-black/5 shadow-sm transition-all duration-200 hover:shadow-md hover:border-purple-200">
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none rounded-2xl"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 text-sm font-bold flex-shrink-0">
          {index + 1}
        </span>
        <p className="flex-1 text-sm font-medium truncate text-gray-800">
          {question.questionText || <span className="text-gray-400">New question...</span>}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600 border border-green-200 font-semibold">
            {question.correctAnswer}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(index); }}
            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {collapsed ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-5 space-y-4 border-t border-black/5 pt-4">
          {/* Question text */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Question</label>
            <textarea
              value={question.questionText}
              onChange={(e) => update({ questionText: e.target.value })}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-black/5 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-300 transition-all placeholder-gray-400"
              placeholder="Enter question text..."
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Options</label>
            {OPTION_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => update({ correctAnswer: key })}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all duration-150 border ${
                    question.correctAnswer === key
                      ? "bg-green-100 border-green-300 text-green-600 shadow-sm"
                      : "bg-gray-100 border-black/5 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {question.correctAnswer === key ? <Check className="w-4 h-4" /> : key}
                </button>
                <input
                  type="text"
                  value={question.options[key]}
                  onChange={(e) => updateOption(key, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-gray-50 border border-black/5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-300 transition-all placeholder-gray-400"
                  placeholder={`Option ${key}...`}
                />
              </div>
            ))}
          </div>

          {/* Explanation */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Explanation</label>
            <textarea
              value={question.explanation}
              onChange={(e) => update({ explanation: e.target.value })}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-black/5 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-300 transition-all placeholder-gray-400"
              placeholder="Why is this the correct answer?"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to create a blank question
export function createBlankQuestion(order: number): QuestionData {
  return {
    questionText: "",
    options: { A: "", B: "", C: "", D: "" },
    correctAnswer: "A",
    explanation: "",
    order,
  };
}
