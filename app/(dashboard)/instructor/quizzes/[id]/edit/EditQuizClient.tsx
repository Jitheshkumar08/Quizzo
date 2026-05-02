"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QuestionEditor, { QuestionData, createBlankQuestion } from "@/components/quiz/QuestionEditor";
import { Save, Send, Loader2, Plus, UnfoldVertical, FoldVertical, Shuffle, RotateCcw, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface EditQuizClientProps {
  quiz: {
    id: string;
    title: string;
    description: string | null;
    isPublished: boolean;
    questions: any[];
  };
}

export default function EditQuizClient({ quiz }: EditQuizClientProps) {
  const router = useRouter();
  
  const [title, setTitle] = useState(quiz.title);
  const [description, setDescription] = useState(quiz.description || "");
  const [questions, setQuestions] = useState<QuestionData[]>(
    quiz.questions.map(q => ({
      questionText: q.questionText,
      options: q.options as { A: string; B: string; C: string; D: string },
      correctAnswer: q.correctAnswer as "A" | "B" | "C" | "D",
      explanation: q.explanation || "",
      order: q.order,
    }))
  );
  
  const [originalQuestions] = useState<QuestionData[]>([...questions]); // For reset

  const [saving, setSaving] = useState(false);
  const [globalCollapsed, setGlobalCollapsed] = useState(true);

  async function handleSave(publish: boolean) {
    setSaving(true);
    try {
      const res = await fetch("/api/quiz/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          title,
          description,
          publish,
          questions,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to save quiz");
        return;
      }

      router.push("/instructor/quizzes");
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  function handleQuestionChange(index: number, updated: QuestionData) {
    setQuestions((prev) => {
      const next = [...prev];
      next[index] = updated;
      return next;
    });
  }

  function handleDeleteQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index).map((q, i) => ({ ...q, order: i })));
  }

  function handleAddQuestion() {
    setQuestions((prev) => [...prev, createBlankQuestion(prev.length)]);
    setGlobalCollapsed(false); // expand so they can see the new one
  }

  function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function handleShuffleQuestions() {
    setQuestions(prev => shuffleArray(prev).map((q, i) => ({ ...q, order: i })));
  }

  function handleShuffleOptions() {
    setQuestions(prev => prev.map(q => {
      const opts = [
        { key: "A", val: q.options.A },
        { key: "B", val: q.options.B },
        { key: "C", val: q.options.C },
        { key: "D", val: q.options.D },
      ];
      const shuffledOpts = shuffleArray(opts);
      
      const newOptions: any = {};
      let newCorrectAnswer = "A";
      
      shuffledOpts.forEach((o, i) => {
        const newKey = String.fromCharCode(65 + i);
        newOptions[newKey] = o.val;
        if (o.key === q.correctAnswer) {
          newCorrectAnswer = newKey;
        }
      });

      return {
        ...q,
        options: newOptions,
        correctAnswer: newCorrectAnswer as "A"|"B"|"C"|"D",
      };
    }));
  }

  function handleResetShuffles() {
    setQuestions([...originalQuestions]);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up pb-20">
      <Link href="/instructor/quizzes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Quizzes
      </Link>

      <div className="space-y-2 relative z-10">
        <label className="text-sm font-bold text-[#2C2A28] ml-1">Quiz Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Chapter 3: Cell Biology"
          className="w-full px-5 py-3.5 rounded-xl bg-white/50 border-2 border-transparent focus:bg-white/80 focus:border-[#8C5D3E]/30 text-[#2C2A28] placeholder-[#918B80] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-300 outline-none font-medium"
        />
      </div>

      <div className="space-y-2 relative z-10">
        <label className="text-sm font-bold text-[#2C2A28] ml-1">Description (optional)</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief description of the quiz content"
          className="w-full px-5 py-3.5 rounded-xl bg-white/50 border-2 border-transparent focus:bg-white/80 focus:border-[#8C5D3E]/30 text-[#2C2A28] placeholder-[#918B80] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-300 outline-none font-medium"
        />
      </div>

      <div className="glass rounded-xl p-6 flex flex-col gap-6 border border-white/20">
        <div className="flex flex-col gap-1">
          <h2 className="font-bold text-2xl text-[#2C2A28]">{title || "Untitled Quiz"}</h2>
          {description && <p className="text-[#918B80] font-medium">{description}</p>}
          <p className="text-sm font-semibold text-[#8b5cf6] mt-2 bg-[#8b5cf6]/10 w-fit px-3 py-1.5 rounded-full">
            {questions.length} questions
          </p>
        </div>

        <div className="flex items-center gap-3 pt-5 border-t border-black/5 w-full overflow-x-auto hide-scrollbar pb-2">
          {/* Tool Group */}
          <div className="flex border border-black/10 bg-white rounded-full overflow-hidden shadow-sm flex-shrink-0">
            <button
              onClick={() => setGlobalCollapsed((prev) => !prev)}
              className="px-4 py-2.5 text-[13px] font-semibold text-[#6B7280] hover:text-[#111827] hover:bg-black/5 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              {globalCollapsed ? <UnfoldVertical className="w-4 h-4" /> : <FoldVertical className="w-4 h-4" />}
              {globalCollapsed ? "Expand All" : "Collapse All"}
            </button>
            <div className="w-[1px] bg-black/10"></div>
            <button
              onClick={handleShuffleQuestions}
              className="px-4 py-2.5 text-[13px] font-semibold text-[#6B7280] hover:text-[#111827] hover:bg-black/5 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Shuffle className="w-4 h-4" /> Mix Qs
            </button>
            <div className="w-[1px] bg-black/10"></div>
            <button
              onClick={handleShuffleOptions}
              className="px-4 py-2.5 text-[13px] font-semibold text-[#6B7280] hover:text-[#111827] hover:bg-black/5 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <Shuffle className="w-4 h-4" /> Mix Options
            </button>
            <div className="w-[1px] bg-black/10"></div>
            <button
              onClick={handleResetShuffles}
              className="px-4 py-2.5 text-[13px] font-semibold text-red-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold border border-black/10 bg-white text-[#111827] hover:bg-black/5 transition-colors disabled:opacity-50 shadow-sm"
            >
              <Save className="w-4 h-4" /> Save Draft
            </button>
            
            <button
              onClick={() => handleSave(true)}
              disabled={saving || questions.length === 0}
              className="animated-button shadow-sm ml-1"
            >
              <svg viewBox="0 0 24 24" className="arr-2" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"></path>
              </svg>
              <span className="text">{saving ? "SAVING..." : (quiz.isPublished ? "SAVE CHANGES" : "PUBLISH QUIZ")}</span>
              <span className="circle"></span>
              <svg viewBox="0 0 24 24" className="arr-1" xmlns="http://www.w3.org/2000/svg">
                <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <QuestionEditor
            key={i}
            question={q}
            index={i}
            onChange={handleQuestionChange}
            onDelete={handleDeleteQuestion}
            isGlobalCollapsed={globalCollapsed}
          />
        ))}
      </div>

      <button
        onClick={handleAddQuestion}
        className="w-full py-4 rounded-xl border-2 border-dashed border-black/10 text-muted-foreground hover:border-purple-500/40 hover:text-purple-600 transition-all flex items-center justify-center gap-2 text-sm font-semibold bg-white/30 hover:bg-white/50"
      >
        <Plus className="w-5 h-5" /> Add Custom Question
      </button>
    </div>
  );
}
