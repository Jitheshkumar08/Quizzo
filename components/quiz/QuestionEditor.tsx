"use client";

import { useState } from "react";
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
  onChange: (index: number, updated: QuestionData) => void;
  onDelete: (index: number) => void;
}

const OPTION_KEYS = ["A", "B", "C", "D"] as const;

export default function QuestionEditor({ question, index, onChange, onDelete }: QuestionEditorProps) {
  const [collapsed, setCollapsed] = useState(false);

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
    <div className="glass rounded-2xl border border-white/5 overflow-hidden transition-all duration-200 hover:border-purple-500/20">
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400 text-sm font-bold flex-shrink-0">
          {index + 1}
        </span>
        <p className="flex-1 text-sm font-medium truncate text-foreground">
          {question.questionText || "New question..."}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
            {question.correctAnswer}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(index); }}
            className="text-muted-foreground hover:text-red-400 transition-colors p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {collapsed ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronUp className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
          {/* Question text */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Question</label>
            <textarea
              value={question.questionText}
              onChange={(e) => update({ questionText: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground resize-none focus:outline-none focus:border-purple-500/50 transition-colors"
              placeholder="Enter question text..."
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Options</label>
            {OPTION_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => update({ correctAnswer: key })}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all duration-200 border ${
                    question.correctAnswer === key
                      ? "bg-green-500/20 border-green-500/40 text-green-400"
                      : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/20"
                  }`}
                >
                  {question.correctAnswer === key ? <Check className="w-4 h-4" /> : key}
                </button>
                <input
                  type="text"
                  value={question.options[key]}
                  onChange={(e) => updateOption(key, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground focus:outline-none focus:border-purple-500/50 transition-colors"
                  placeholder={`Option ${key}...`}
                />
              </div>
            ))}
          </div>

          {/* Explanation */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Explanation</label>
            <textarea
              value={question.explanation}
              onChange={(e) => update({ explanation: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-foreground resize-none focus:outline-none focus:border-purple-500/50 transition-colors"
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
