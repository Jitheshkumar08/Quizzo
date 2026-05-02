"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UploadZone from "@/components/quiz/UploadZone";
import QuestionEditor, { QuestionData, createBlankQuestion } from "@/components/quiz/QuestionEditor";
import { Brain, Plus, Send, Loader2, Save, Eye } from "lucide-react";

type Step = "upload" | "edit" | "publishing";

export default function InstructorUploadPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [remainingText, setRemainingText] = useState("");
  const [jsonBlobUrl, setJsonBlobUrl] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);

  async function handleGenerate() {
    if (!file || !title.trim()) return;
    setGenerating(true);
    setGenerateError("");

    try {
      const formData = new FormData();
      formData.append("pdf", file);
      formData.append("title", title);

      const res = await fetch("/api/quiz/generate", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        setGenerateError(data.error || "Generation failed");
        return;
      }

      const mapped: QuestionData[] = data.questions.map(
        (q: any, i: number) => ({
          questionText: q.question,
          options: q.options,
          correctAnswer: q.correct_answer,
          explanation: q.explanation || "",
          order: i,
        })
      );

      setQuestions(mapped);
      setRemainingText(data.remainingText || "");
      setJsonBlobUrl(data.jsonBlobUrl || undefined);
      setStep("edit");
    } finally {
      setGenerating(false);
    }
  }

  async function handleFetchMore() {
    if (!remainingText) return;
    setFetchingMore(true);

    try {
      const res = await fetch("/api/quiz/generate-more", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remainingText }),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to fetch more questions");
        return;
      }

      const mapped: QuestionData[] = data.questions.map(
        (q: any, i: number) => ({
          questionText: q.question,
          options: q.options,
          correctAnswer: q.correct_answer,
          explanation: q.explanation || "",
          order: questions.length + i,
        })
      );

      setQuestions((prev) => [...prev, ...mapped]);
      setRemainingText(data.remainingText || "");
    } catch (e) {
      console.error(e);
      alert("Error fetching more questions.");
    } finally {
      setFetchingMore(false);
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
  }

  async function handlePublish(publish: boolean) {
    setPublishing(true);
    try {
      const res = await fetch("/api/quiz/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          jsonBlobUrl,
          publish,
          questions,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to save");
        return;
      }

      router.push(`/instructor/quizzes`);
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold gradient-text">Generate Quiz from PDF</h1>
        <p className="text-muted-foreground text-sm mt-1">Upload a PDF and AI will extract comprehensive MCQs</p>
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">Quiz Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 3: Cell Biology"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder-muted-foreground focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">Description (optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the quiz content"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder-muted-foreground focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground/80">PDF File *</label>
            <UploadZone
              onFileSelect={setFile}
              selectedFile={file}
              onClear={() => setFile(null)}
              disabled={generating}
            />
          </div>

          {generateError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {generateError}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!file || !title.trim() || generating}
            className="w-full py-3.5 px-6 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
            style={{ background: "linear-gradient(135deg, hsl(262 80% 65%), hsl(199 89% 48%))" }}
          >
            {generating ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Generating questions with AI...</>
            ) : (
              <><Brain className="w-5 h-5" /> Generate MCQs with AI</>
            )}
          </button>

          {generating && (
            <p className="text-center text-sm text-muted-foreground animate-pulse">
              This may take 15–30 seconds. Gemini is reading your PDF...
            </p>
          )}
        </div>
      )}

      {/* Step 2: Edit */}
      {step === "edit" && (
        <div className="space-y-5">
          {/* Stats bar */}
          <div className="glass rounded-xl p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">{questions.length} questions generated</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handlePublish(false)}
                disabled={publishing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium glass glass-hover border border-white/10 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Save Draft
              </button>
              <button
                onClick={() => handlePublish(true)}
                disabled={publishing || questions.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, hsl(262 80% 65%), hsl(199 89% 48%))" }}
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Publish Quiz
              </button>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-3">
            {questions.map((q, i) => (
              <QuestionEditor
                key={i}
                question={q}
                index={i}
                onChange={handleQuestionChange}
                onDelete={handleDeleteQuestion}
              />
            ))}
          </div>

          {/* Add question */}
          <div className="flex gap-3">
            <button
              onClick={handleAddQuestion}
              className="flex-1 py-3 rounded-xl border-2 border-dashed border-white/10 text-muted-foreground hover:border-purple-500/40 hover:text-purple-400 transition-all flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Add Custom Question
            </button>

            {remainingText && (
              <button
                onClick={handleFetchMore}
                disabled={fetchingMore}
                className="flex-1 py-3 rounded-xl border-2 border-dashed border-purple-500/30 text-purple-400 hover:border-purple-500 hover:bg-purple-500/10 transition-all flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-50"
              >
                {fetchingMore ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Fetching more...</>
                ) : (
                  <><Brain className="w-4 h-4" /> Fetch More Questions from PDF</>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
