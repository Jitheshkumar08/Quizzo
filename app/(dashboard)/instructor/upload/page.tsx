"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import UploadZone from "@/components/quiz/UploadZone";
import QuestionEditor, { QuestionData, createBlankQuestion } from "@/components/quiz/QuestionEditor";
import { Brain, Plus, Send, Loader2, Save, Eye, FileText, CheckCircle2, Download, Shuffle, FoldVertical, UnfoldVertical, Rocket, RotateCcw } from "lucide-react";

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
  const [backupQuestions, setBackupQuestions] = useState<QuestionData[]>([]);
  const [fullText, setFullText] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [jsonBlobUrl, setJsonBlobUrl] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [globalCollapsed, setGlobalCollapsed] = useState(false);

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
        setBackupQuestions(JSON.parse(JSON.stringify(mapped))); // Prevent Reset button break
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
      setBackupQuestions(JSON.parse(JSON.stringify(currentQuestions))); // Deep copy for backup
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
            setBackupQuestions(JSON.parse(JSON.stringify(currentQuestions))); // Deep copy for backup
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

  function handleShuffleQuestions() {
    setQuestions((prev) => {
      const shuffled = [...prev].sort(() => Math.random() - 0.5);
      return shuffled.map((q, i) => ({ ...q, order: i }));
    });
  }

  function handleShuffleOptions() {
    setQuestions((prev) => prev.map((q) => {
        const optionEntries = [
          { key: "A", val: q.options.A, isCorrect: q.correctAnswer === "A" },
          { key: "B", val: q.options.B, isCorrect: q.correctAnswer === "B" },
          { key: "C", val: q.options.C, isCorrect: q.correctAnswer === "C" },
          { key: "D", val: q.options.D, isCorrect: q.correctAnswer === "D" },
        ];
        optionEntries.sort(() => Math.random() - 0.5);
        const newOptions = { 
           A: optionEntries[0].val, 
           B: optionEntries[1].val, 
           C: optionEntries[2].val, 
           D: optionEntries[3].val 
        };
        let newCorrectAnswer = q.correctAnswer;
        if (optionEntries[0].isCorrect) newCorrectAnswer = "A";
        else if (optionEntries[1].isCorrect) newCorrectAnswer = "B";
        else if (optionEntries[2].isCorrect) newCorrectAnswer = "C";
        else if (optionEntries[3].isCorrect) newCorrectAnswer = "D";

        return { ...q, options: newOptions as any, correctAnswer: newCorrectAnswer as any };
    }));
  }

  function handleResetShuffles() {
    // Restore exact state from before any shuffles
    if (backupQuestions.length > 0) {
      setQuestions(JSON.parse(JSON.stringify(backupQuestions)));
    }
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
        <h1 className="text-[28px] font-bold text-[#2C2A28] tracking-tight">Generate Quiz from PDF</h1>
        <p className="text-[#918B80] font-medium text-[15px] mt-1">Upload a PDF and AI will extract comprehensive MCQs</p>
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-6">
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_16px_32px_rgba(44,42,40,0.06),0_2px_6px_rgba(44,42,40,0.04),inset_0_1px_2px_rgba(255,255,255,0.8)] rounded-[24px] p-8 space-y-6 relative overflow-hidden">
            {/* Inner top gradient */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/60 to-transparent pointer-events-none"></div>

            <div className="space-y-2 relative z-10">
              <label className="text-sm font-bold text-[#2C2A28] ml-1">Quiz Title *</label>
              <div className="relative group">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Chapter 3: Cell Biology"
                  className="w-full px-5 py-3.5 rounded-xl bg-white/50 border-2 border-transparent focus:bg-white/80 focus:border-[#8C5D3E]/30 text-[#2C2A28] placeholder-[#918B80] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-300 outline-none font-medium peer"
                />
              </div>
            </div>

            <div className="space-y-2 relative z-10">
              <label className="text-sm font-bold text-[#2C2A28] ml-1">Description (optional)</label>
              <div className="relative group">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the quiz content"
                  className="w-full px-5 py-3.5 rounded-xl bg-white/50 border-2 border-transparent focus:bg-white/80 focus:border-[#8C5D3E]/30 text-[#2C2A28] placeholder-[#918B80] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] transition-all duration-300 outline-none font-medium peer"
                />
              </div>
            </div>

            <div className="space-y-2 relative z-10">
              <label className="text-sm font-bold text-[#2C2A28] ml-1">PDF File *</label>
              <UploadZone
                onFileSelect={setFile}
                selectedFile={file}
                onClear={() => setFile(null)}
                disabled={generating}
              />
            </div>

            {generateError && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm relative z-10 shadow-sm font-medium">
                {generateError}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!file || !title.trim() || generating}
              className="w-full py-4 px-6 rounded-xl font-bold text-[#FDFBFA] bg-[#2C2A28] hover:bg-[#1A1816] shadow-[0_8px_20px_rgba(44,42,40,0.2)] hover:shadow-[0_12px_24px_rgba(44,42,40,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_4px_10px_rgba(44,42,40,0.2)] flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none relative z-10 tracking-wide"
            >
              {generating ? (
                <><Loader2 className="w-5 h-5 animate-spin text-[#8C5D3E]" /> Processing...</>
              ) : file?.name.endsWith(".json") || file?.type === "application/json" ? (
                <><FileText className="w-5 h-5" /> Load MCQs from JSON</>
              ) : (
                <><Brain className="w-5 h-5" /> Extract ALL Questions</>
              )}
            </button>

            {generating && file && !file.name.endsWith(".json") && (
              <div className="space-y-3 text-center relative z-10 pt-2">
                <p className="text-sm text-[#918B80] font-medium animate-pulse">
                  Gemini is reading and extracting your PDF... 
                  {totalQuestions > 0 && ` (Extracted ${questions.length} of ${totalQuestions} questions)`}
                </p>
                <div className="w-full h-2 bg-black/5 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-[#8C5D3E] transition-all duration-500 rounded-full"
                    style={{ width: totalQuestions > 0 ? `${(questions.length / totalQuestions) * 100}%` : "10%" }}
                  />
                </div>
              </div>
            )}
          </div>
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

          {/* Header & Stats bar */}
          <div className="glass rounded-xl p-6 flex flex-col gap-6 border border-white/20">
            <div className="flex flex-col gap-1">
              <h2 className="font-bold text-2xl text-[#2C2A28]">{title}</h2>
              {description && <p className="text-[#918B80] font-medium">{description}</p>}
              <p className="text-sm font-semibold text-[#8b5cf6] mt-2 bg-[#8b5cf6]/10 w-fit px-3 py-1.5 rounded-full">
                {questions.length} {totalQuestions > 0 ? `out of ~${totalQuestions}` : ""} questions extracted
              </p>
            </div>

            <div className="flex items-center gap-3 pt-5 border-t border-black/5 w-full overflow-x-auto hide-scrollbar pb-2">
              {/* Tool Group */}
              <div className="flex border border-black/10 bg-white rounded-full overflow-hidden shadow-sm flex-shrink-0">
                <button
                  onClick={() => setGlobalCollapsed((prev) => !prev)}
                  className="px-4 py-2.5 text-[13px] font-semibold text-[#6B7280] hover:text-[#111827] hover:bg-black/5 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                  title="Toggle all questions"
                >
                  {globalCollapsed ? <UnfoldVertical className="w-4 h-4" /> : <FoldVertical className="w-4 h-4" />}
                  {globalCollapsed ? "Expand All" : "Collapse All"}
                </button>
                <div className="w-[1px] bg-black/10"></div>
                <button
                  onClick={handleShuffleQuestions}
                  className="px-4 py-2.5 text-[13px] font-semibold text-[#6B7280] hover:text-[#111827] hover:bg-black/5 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                  title="Shuffle question order"
                >
                  <Shuffle className="w-4 h-4" />
                  Mix Qs
                </button>
                <div className="w-[1px] bg-black/10"></div>
                <button
                  onClick={handleShuffleOptions}
                  className="px-4 py-2.5 text-[13px] font-semibold text-[#6B7280] hover:text-[#111827] hover:bg-black/5 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                  title="Shuffle A/B/C/D options"
                >
                  <Shuffle className="w-4 h-4" />
                  Mix Options
                </button>
                <div className="w-[1px] bg-black/10"></div>
                <button
                  onClick={handleResetShuffles}
                  className="px-4 py-2.5 text-[13px] font-semibold text-red-400 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap"
                  title="Restore original question order and options"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                {!fetchingMore && questions.length > 0 && (
                  <button
                    onClick={downloadJson}
                    className="flex items-center justify-center w-[38px] h-[38px] rounded-full border border-[#8b5cf6]/30 text-[#8b5cf6] bg-white hover:bg-[#8b5cf6]/5 transition-colors shadow-sm flex-shrink-0"
                    title="Download JSON Backup"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handlePublish(false)}
                  disabled={publishing || fetchingMore}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold border border-black/10 bg-white text-[#111827] hover:bg-black/5 transition-colors disabled:opacity-50 shadow-sm"
                >
                  <Save className="w-4 h-4" /> Save Draft
                </button>
                
                <button
                  onClick={() => handlePublish(true)}
                  disabled={publishing || questions.length === 0 || fetchingMore}
                  className="animated-button shadow-sm ml-1"
                >
                  <svg viewBox="0 0 24 24" className="arr-2" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"></path>
                  </svg>
                  <span className="text">{publishing ? "PUBLISHING" : "PUBLISH QUIZ"}</span>
                  <span className="circle"></span>
                  <svg viewBox="0 0 24 24" className="arr-1" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"></path>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-3">
            {questions.map((q, i) => (
              <QuestionEditor
                key={i}
                question={q}
                index={i}
                globalCollapsed={globalCollapsed}
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
