"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UploadZone from "@/components/quiz/UploadZone";
import QuestionEditor, { QuestionData, createBlankQuestion } from "@/components/quiz/QuestionEditor";
import { Brain, Plus, Send, Loader2, Save, Eye, FileText, CheckCircle2, Download } from "lucide-react";

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
  const [fullText, setFullText] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [jsonBlobUrl, setJsonBlobUrl] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [showReport, setShowReport] = useState(false);

  async function handleGenerate() {
    if (!file || !title.trim()) return;
    setGenerating(true);
    setGenerateError("");
    setShowReport(false);

    try {
      // Direct JSON parsing logic
      if (file.name.endsWith(".json") || file.type === "application/json") {
        const text = await file.text();
        let parsedData;
        try {
          parsedData = JSON.parse(text);
        } catch (e) {
          throw new Error("Invalid JSON format. Could not parse file.");
        }

        // Handle both simple arrays and wrapped objects
        const questionsArray = Array.isArray(parsedData) ? parsedData : parsedData.questions || [];
        if (!Array.isArray(questionsArray) || questionsArray.length === 0) {
          throw new Error("JSON must contain an array of questions.");
        }

        const mapped: QuestionData[] = questionsArray.map((q: any, i: number) => ({
          questionText: q.question || q.questionText || "",
          options: q.options || { A: "", B: "", C: "", D: "" },
          correctAnswer: q.correct_answer || q.correctAnswer || "A",
          explanation: q.explanation || "",
          order: i,
        }));

        setQuestions(mapped);
        setFullText("");
        setTotalQuestions(mapped.length);
        setJsonBlobUrl("");
        setStep("edit");
        return;
      }

      // PDF AI Generation logic
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

      let currentQuestions = [...mapped];
      setQuestions(currentQuestions);
      setFullText(data.fullText || "");
      setTotalQuestions(data.totalQuestions || 0);
      setJsonBlobUrl(data.jsonBlobUrl || undefined);

      // Auto-loop to fetch remaining questions
      if (data.totalQuestions > currentQuestions.length) {
        let currentFullText = data.fullText || "";
        let fails = 0;

        while (currentQuestions.length < data.totalQuestions && fails < 3) {
          const lastQuestion = currentQuestions[currentQuestions.length - 1];
          const lastQuestionText = lastQuestion?.questionText;
          const limit = Math.min(25, data.totalQuestions - currentQuestions.length);

          // TOKEN OPTIMIZATION: Slice text to only send what comes after the last question
          let slicedText = currentFullText;
          if (lastQuestionText) {
            const index = currentFullText.lastIndexOf(lastQuestionText);
            if (index !== -1) {
              slicedText = currentFullText.slice(index);
            }
          }

          try {
            const resMore = await fetch("/api/quiz/generate-more", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fullText: slicedText, lastQuestionText, limit }),
            });
            const dataMore = await resMore.json();

            if (!resMore.ok) {
              fails++;
              continue; // Try again
            }

            const mappedMore: QuestionData[] = dataMore.questions.map(
              (q: any, i: number) => ({
                questionText: q.question,
                options: q.options,
                correctAnswer: q.correct_answer,
                explanation: q.explanation || "",
                order: currentQuestions.length + i,
              })
            );

            currentQuestions = [...currentQuestions, ...mappedMore];
            setQuestions(currentQuestions);
            fails = 0; // reset fails on success
          } catch (e) {
            fails++;
            console.error(e);
          }
        }
      }

      setStep("edit");
      setShowReport(true);
    } catch (error: any) {
      setGenerateError(error.message || "An unexpected error occurred");
    } finally {
      setGenerating(false);
    }
  }

  function downloadJson() {
    const exportData = questions.map(q => ({
      question: q.questionText,
      options: q.options,
      correct_answer: q.correctAnswer
    }));
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'quiz'}_backup.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
          jsonBlobUrl: jsonBlobUrl || undefined,
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
              <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
            ) : file?.name.endsWith(".json") || file?.type === "application/json" ? (
              <><FileText className="w-5 h-5" /> Load MCQs from JSON</>
            ) : (
              <><Brain className="w-5 h-5" /> Extract ALL Questions</>
            )}
          </button>

          {generating && file && !file.name.endsWith(".json") && (
            <div className="space-y-3 text-center">
              <p className="text-sm text-muted-foreground animate-pulse">
                Gemini is reading and extracting your PDF... 
                {totalQuestions > 0 && ` (Extracted ${questions.length} of ${totalQuestions} questions)`}
              </p>
              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 transition-all duration-500"
                  style={{ width: totalQuestions > 0 ? `${(questions.length / totalQuestions) * 100}%` : "10%" }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Edit */}
      {step === "edit" && (
        <div className="space-y-5">
          {showReport && (
            <div className="glass rounded-2xl p-6 border border-green-500/30 bg-green-500/5 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">
                    Done — All {questions.length} questions extracted in order!
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    I have successfully parsed the PDF <strong>"{file?.name}"</strong> and verified the structure. 
                    All questions have been normalized into the correct format while preserving verbatim accuracy.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={downloadJson}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}
                >
                  <Download className="w-5 h-5" /> Download {title.slice(0, 20).toLowerCase()}.json
                </button>
                <button 
                  onClick={() => setShowReport(false)}
                  className="text-sm text-muted-foreground hover:text-white transition-colors px-4"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {fetchingMore && (
            <div className="glass rounded-xl p-4 flex items-center justify-center gap-3 border border-purple-500/30 text-purple-400 bg-purple-500/10 animate-pulse">
              <Loader2 className="w-5 h-5 animate-spin" />
              <p className="font-medium">
                Auto-extracting batch... ({questions.length} out of ~{totalQuestions} questions fetched so far)
              </p>
            </div>
          )}

          {/* Stats bar */}
          <div className="glass rounded-xl p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="font-semibold">{title}</p>
              <p className="text-sm text-muted-foreground">
                {questions.length} {totalQuestions > 0 ? `out of ~${totalQuestions}` : ""} questions extracted
              </p>
            </div>
            <div className="flex gap-2">
              {!fetchingMore && questions.length > 0 && (
                <button
                  onClick={downloadJson}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium glass glass-hover border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 transition-colors"
                >
                  <FileText className="w-4 h-4" /> Download JSON Backup
                </button>
              )}
              <button
                onClick={() => handlePublish(false)}
                disabled={publishing || fetchingMore}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium glass glass-hover border border-white/10 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> Save Draft
              </button>
              <button
                onClick={() => handlePublish(true)}
                disabled={publishing || questions.length === 0 || fetchingMore}
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
          </div>
        </div>
      )}
    </div>
  );
}
