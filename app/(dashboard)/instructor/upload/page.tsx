"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import UploadZone from "@/components/quiz/UploadZone";
import QuestionEditor, { QuestionData, createBlankQuestion } from "@/components/quiz/QuestionEditor";
import { Brain, Plus, Send, Loader2, Save, Eye, FileText, CheckCircle2, Download, Shuffle, FoldVertical, UnfoldVertical, Rocket, RotateCcw, Info, X, AlertTriangle, Copy, Check } from "lucide-react";
import QuizAccessSettings from "@/components/quiz/QuizAccessSettings";
import { appDatetimeLocalToISOString } from "@/lib/timezone";

type Step = "upload" | "edit" | "publishing";

const PROMPT_TEXT = `I will upload a PDF that contains MCQ questions and an answer key / highlighted correct answers.

Your task:
Convert ALL questions from the PDF into a valid JSON file.

Output requirement:
Create and give me a downloadable \`.json\` file. Do not paste the full JSON in chat unless I ask.

Important rules:
1. Do not miss any question.
2. Keep all questions in the exact same order as the PDF.
3. Use the exact question text from the PDF.
4. Use the exact option text from the PDF.
5. Each question must have exactly 4 options: A, B, C, and D.
6. Add the correct answer as only the option letter: "A", "B", "C", or "D".
7. Do not add explanations inside the JSON.
8. Do not change the meaning of any question or option.
9. If the PDF has formatting mistakes, fix only the option labels, but keep the actual text unchanged.
10. Make sure the final file is valid JSON.

Required JSON structure:

[
  {
    "question": "Exact question text",
    "options": {
      "A": "Exact option A text",
      "B": "Exact option B text",
      "C": "Exact option C text",
      "D": "Exact option D text"
    },
    "correct_answer": "A"
  }
]

Token-saving rule:
Do not print the full JSON in the chat. Only create the JSON file and reply with:
- total number of questions converted
- downloadable JSON file link
- any small note if a formatting issue was fixed

Before creating the file, carefully cross-check:
- total number of questions
- question order
- all options A-D
- correct answer for every question
- valid JSON syntax`;

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
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [requireQuizPassword, setRequireQuizPassword] = useState(false);
  const [quizAccessPassword, setQuizAccessPassword] = useState("");
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(false);
  const [timeLimitEnabled, setTimeLimitEnabled] = useState(false);
  const [timeLimitMinutesVal, setTimeLimitMinutesVal] = useState(30);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function handleCopyPrompt() {
    navigator.clipboard.writeText(PROMPT_TEXT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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

  function handleShuffleQuestionsToggle() {
    setShuffleQuestions(!shuffleQuestions);
  }

  function handleShuffleOptionsToggle() {
    setShuffleOptions(!shuffleOptions);
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
          scheduleEnabled,
          scheduledStart: scheduleEnabled && scheduledStart ? appDatetimeLocalToISOString(scheduledStart) : null,
          scheduledEnd: scheduleEnabled && scheduledEnd ? appDatetimeLocalToISOString(scheduledEnd) : null,
          requireQuizPassword,
          quizAccessPassword: quizAccessPassword.trim() || undefined,
          allowMultipleAttempts,
          shuffleQuestions,
          shuffleOptions,
          timeLimitEnabled,
          timeLimitMinutes: timeLimitEnabled ? timeLimitMinutesVal : null,
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold text-[#2C2A28] tracking-tight">Generate Quiz from PDF </h1>
          <p className="text-[#918B80] font-medium text-[15px] mt-1">Upload a PDF and AI will extract comprehensive MCQs</p>
          <p className="text-[red] font-medium text-[15px] mt-1">(Please use a JSON file by copying the format from the Upload Guide.)</p>
        </div>
        <button onClick={() => setShowDisclaimer(true)} className="relative inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white transition-all duration-300 self-start md:self-auto group mt-2 md:mt-0 rounded-xl">
          {/* Beautiful spreading background glow */}
          <div className="absolute -inset-[3px] rounded-xl bg-gradient-to-r from-[#a3f7bf] via-[#fce7a1] via-[#fcb6b6] to-[#c19dfa] opacity-70 blur-[8px] group-hover:opacity-100 group-hover:blur-[12px] transition-all duration-500" />
          
          {/* Solid crisp colorful border */}
          <div className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-[#a3f7bf] via-[#fce7a1] via-[#fcb6b6] to-[#c19dfa] opacity-100 transition-all duration-500" />
          
          {/* Main dark inner surface */}
          <div className="absolute inset-0 rounded-[10px] bg-[#323232] group-hover:bg-[#3f3f3f] transition-colors duration-300" />
          
          {/* Content */}
          <Info className="w-4 h-4 relative z-10 group-hover:scale-110 transition-transform duration-300" />
          <span className="relative z-10 tracking-wide">Upload Guide</span>
        </button>
      </div>

      {/* Step 1: Upload */}
      {step === "upload" && (
        <div className="space-y-6">
          <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-[0_16px_32px_rgba(44,42,40,0.06),0_2px_6px_rgba(44,42,40,0.04),inset_0_1px_2px_rgba(255,255,255,0.8)] rounded-2xl sm:rounded-[24px] p-5 sm:p-8 space-y-5 sm:space-y-6 relative overflow-hidden">
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
          <div className="glass rounded-xl p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 border border-white/20">
            <div className="flex flex-col gap-1">
              <h2 className="font-bold text-xl sm:text-2xl text-[#2C2A28] truncate">{title}</h2>
              {description && <p className="text-[#918B80] font-medium text-sm sm:text-base line-clamp-2">{description}</p>}
              <p className="text-xs sm:text-sm font-semibold text-[#8b5cf6] mt-2 bg-[#8b5cf6]/10 w-fit px-3 py-1.5 rounded-full">
                {questions.length} {totalQuestions > 0 ? `out of ~${totalQuestions}` : ""} questions extracted
              </p>
            </div>

            <div className="flex flex-col xl:flex-row xl:items-center gap-4 pt-5 border-t border-black/5 w-full">
              {/* Tool Group */}
              <div className="flex flex-wrap sm:flex-nowrap border border-black/10 bg-white rounded-xl sm:rounded-full overflow-hidden shadow-sm flex-shrink-0">
                <button
                  onClick={() => setGlobalCollapsed((prev) => !prev)}
                  className="px-4 py-2.5 text-[13px] font-semibold text-[#6B7280] hover:text-[#111827] hover:bg-black/5 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap flex-grow sm:flex-grow-0"
                  title="Toggle all questions"
                >
                  {globalCollapsed ? <UnfoldVertical className="w-4 h-4" /> : <FoldVertical className="w-4 h-4" />}
                  <span className="hidden sm:inline">{globalCollapsed ? "Expand All" : "Collapse All"}</span>
                  <span className="sm:hidden">{globalCollapsed ? "Expand" : "Collapse"}</span>
                </button>
                <div className="w-full h-[1px] sm:w-[1px] sm:h-auto bg-black/10 hidden sm:block"></div>
                <button
                  onClick={handleShuffleQuestionsToggle}
                  className={`px-4 py-2.5 text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap flex-grow sm:flex-grow-0 border-t sm:border-t-0 sm:border-l border-black/10 ${shuffleQuestions ? "bg-green-100 text-green-700 hover:bg-green-200" : "text-[#6B7280] hover:text-[#111827] hover:bg-black/5"}`}
                  title="Shuffle question order for students"
                >
                  <Shuffle className="w-4 h-4" />
                  Mix Qs
                </button>
                <div className="w-full h-[1px] sm:w-[1px] sm:h-auto bg-black/10 hidden sm:block"></div>
                <button
                  onClick={handleShuffleOptionsToggle}
                  className={`px-4 py-2.5 text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap flex-grow sm:flex-grow-0 border-t sm:border-t-0 sm:border-l border-black/10 ${shuffleOptions ? "bg-green-100 text-green-700 hover:bg-green-200" : "text-[#6B7280] hover:text-[#111827] hover:bg-black/5"}`}
                  title="Shuffle A/B/C/D options for students"
                >
                  <Shuffle className="w-4 h-4" />
                  <span className="hidden sm:inline">Mix Options</span><span className="sm:hidden">Options</span>
                </button>
              </div>

              <div className="flex-1 hidden xl:block" />

              <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0 justify-end flex-wrap xl:flex-shrink-0">
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
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold border border-black/10 bg-white text-[#111827] hover:bg-black/5 transition-colors disabled:opacity-50 shadow-sm flex-1 sm:flex-none justify-center"
                >
                  <Save className="w-4 h-4" /> Save Draft
                </button>
                
                <div className="w-full sm:w-auto flex justify-end">
                  <button
                    onClick={() => handlePublish(true)}
                    disabled={publishing || questions.length === 0 || fetchingMore}
                    className="animated-button shadow-sm w-full sm:w-auto"
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
          </div>

          <QuizAccessSettings
            variant="glass"
            scheduleEnabled={scheduleEnabled}
            onScheduleEnabled={setScheduleEnabled}
            scheduledStart={scheduledStart}
            scheduledEnd={scheduledEnd}
            onScheduledStart={setScheduledStart}
            onScheduledEnd={setScheduledEnd}
            requireQuizPassword={requireQuizPassword}
            onRequireQuizPassword={setRequireQuizPassword}
            quizAccessPassword={quizAccessPassword}
            onQuizAccessPassword={setQuizAccessPassword}
            allowMultipleAttempts={allowMultipleAttempts}
            onAllowMultipleAttempts={setAllowMultipleAttempts}
            timeLimitEnabled={timeLimitEnabled}
            onTimeLimitEnabled={setTimeLimitEnabled}
            timeLimitMinutes={timeLimitMinutesVal}
            onTimeLimitMinutes={setTimeLimitMinutesVal}
          />

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

      {/* Disclaimer Modal - Rendered via Portal to guarantee perfect center screen positioning regardless of parent CSS transforms */}
      {showDisclaimer && mounted && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6" style={{ isolation: 'isolate' }}>
          {/* Deep Blur Backdrop */}
          <div 
            className="fixed inset-0 bg-[#2C2A28]/40 backdrop-blur-md transition-opacity animate-in fade-in duration-300"
            onClick={() => setShowDisclaimer(false)}
          ></div>
          
          {/* Modal Content */}
          <div className="relative w-full max-w-2xl bg-white/90 backdrop-blur-2xl rounded-[32px] shadow-[0_32px_64px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.8)] border border-white/60 flex flex-col overflow-hidden max-h-[90vh] animate-in fade-in zoom-in-95 duration-300 z-10">
            
            {/* Header */}
            <div className="p-6 sm:p-8 flex items-center justify-between flex-shrink-0 relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20 flex items-center justify-center shadow-inner">
                  <Info className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-[20px] font-bold text-[#2C2A28] leading-tight">Upload Guide</h2>
                  <p className="text-[13px] font-medium text-[#918B80] mt-0.5">Best practices for perfect JSON extraction</p>
                </div>
              </div>
              <button 
                onClick={() => setShowDisclaimer(false)} 
                className="w-10 h-10 rounded-full bg-[#2C2A28]/5 hover:bg-[#2C2A28]/10 text-[#2C2A28]/60 hover:text-[#2C2A28] flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="px-6 sm:px-8 pb-8 overflow-y-auto custom-scrollbar flex-1 relative z-10 space-y-6">
              
              {/* Warning Card */}
              <div className="bg-gradient-to-r from-orange-50 to-orange-50/30 border border-orange-200/60 rounded-[20px] p-5 flex gap-4 shadow-[inset_0_1px_1px_rgba(255,255,255,1)]">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-orange-900">Slow PDF Conversion Notice</h3>
                  <p className="text-orange-800/80 text-[14px] mt-1.5 leading-relaxed font-medium">
                    Direct PDF conversion may take a while as we are on a free-tier API. For instant, perfectly formatted results, use an advanced AI (like ChatGPT or Claude) to extract the questions first, then upload the <code className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded-md text-[13px] font-bold mx-0.5">.json</code> file here directly!
                  </p>
                </div>
              </div>

              {/* Code Section */}
              <div className="space-y-3">
                 <h3 className="font-bold text-[#2C2A28] text-[15px] px-1">Use this exact prompt for flawless results:</h3>
                 
                 <div className="relative group rounded-[24px] overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.15)] border border-[#2C2A28] bg-[#1A1816]">
                   {/* MacOS style terminal header */}
                   <div className="absolute top-0 left-0 w-full h-12 bg-white/5 border-b border-white/10 flex items-center px-4 justify-between z-10 backdrop-blur-md">
                     <div className="flex items-center gap-2">
                       <div className="w-3 h-3 rounded-full bg-[#FF5F56]"></div>
                       <div className="w-3 h-3 rounded-full bg-[#FFBD2E]"></div>
                       <div className="w-3 h-3 rounded-full bg-[#27C93F]"></div>
                     </div>
                     <button 
                       onClick={handleCopyPrompt} 
                       className="h-8 px-3 rounded-lg bg-white/10 hover:bg-white/20 border cursor-pointer border-white/10 text-white text-[13px] font-bold flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                     >
                       {copied ? <><Check className="w-3.5 h-3.5 text-green-400" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                     </button>
                   </div>
                   
                   {/* Scrollable code block */}
                   <pre className="text-gray-300 p-6 text-[13px] overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-[320px] overflow-y-auto custom-scrollbar pt-16 selection:bg-[#8b5cf6] selection:text-white">
                     {PROMPT_TEXT}
                   </pre>
                 </div>
              </div>

            </div>
            
            {/* Footer */}
            <div className="p-6 sm:px-8 sm:py-6 border-t border-black/5 bg-[#FDFBFA]/50 backdrop-blur-xl flex justify-end flex-shrink-0 relative z-10">
              <button 
                onClick={() => setShowDisclaimer(false)} 
                className="px-8 py-3 rounded-full bg-[#2C2A28] text-white text-[15px] font-bold hover:bg-black transition-all hover:-translate-y-0.5 shadow-[0_8px_16px_rgba(44,42,40,0.2)] active:translate-y-0 active:shadow-none cursor-pointer"
              >
                I Understand
              </button>
            </div>
            
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
