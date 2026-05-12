"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import QuestionEditor, { QuestionData, createBlankQuestion } from "@/components/quiz/QuestionEditor";
import {
  Save, Send, Loader2, Plus, UnfoldVertical, FoldVertical,
  Shuffle, ArrowLeft, BookOpen, CheckCircle2,
  Trash2, EyeOff, Eye, BarChart2, X, Clock,
  ChevronLeft, ChevronRight, AlertTriangle
} from "lucide-react";
import Link from "next/link";
import QuizAccessSettings from "@/components/quiz/QuizAccessSettings";
import { toDatetimeLocalValue } from "@/lib/datetime-local";
import { appDatetimeLocalToISOString, formatAppDate, formatAppTime } from "@/lib/timezone";

interface EditQuizClientProps {
  quiz: {
    id: string;
    title: string;
    description: string | null;
    isPublished: boolean;
    isClosed: boolean;
    questions: QuizQuestion[];
    scheduledStart: Date | null;
    scheduledEnd: Date | null;
    allowMultipleAttempts: boolean;
    shuffleQuestions: boolean;
    shuffleOptions: boolean;
    hasAccessPassword: boolean;
    timeLimitMinutes: number | null;
  };
}

type QuizQuestion = {
  id?: string;
  questionText: string;
  options: unknown;
  correctAnswer: string;
  explanation?: string | null;
  order: number;
};

type AnalyticsResult = {
  id: string;
  studentName: string;
  username: string;
  profileImageUrl: string | null;
  score: number;
  totalQuestions: number;
  percentage: number;
  timeTaken: number | null;
  submittedAt: string;
};

export default function EditQuizClient({ quiz }: EditQuizClientProps) {
  const router = useRouter();

  const [title, setTitle] = useState(quiz.title);
  const [description, setDescription] = useState(quiz.description || "");
  const [questions, setQuestions] = useState<QuestionData[]>(
    quiz.questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      options: q.options as { A: string; B: string; C: string; D: string },
      correctAnswer: q.correctAnswer as "A" | "B" | "C" | "D",
      explanation: q.explanation || "",
      order: q.order,
    }))
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isPublished, setIsPublished] = useState(quiz.isPublished);
  const [isClosed, setIsClosed] = useState(quiz.isClosed);
  const [globalCollapsed, setGlobalCollapsed] = useState(true);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const questionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [expandedMap, setExpandedMap] = useState<Record<number, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsResult[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const initialSchedule =
    !!(quiz.scheduledStart && quiz.scheduledEnd);
  const [scheduleEnabled, setScheduleEnabled] = useState(initialSchedule);
  const [scheduledStart, setScheduledStart] = useState(
    toDatetimeLocalValue(quiz.scheduledStart)
  );
  const [scheduledEnd, setScheduledEnd] = useState(toDatetimeLocalValue(quiz.scheduledEnd));
  const [requireQuizPassword, setRequireQuizPassword] = useState(quiz.hasAccessPassword);
  const [quizAccessPassword, setQuizAccessPassword] = useState("");
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(quiz.allowMultipleAttempts);
  const [shuffleQuestions, setShuffleQuestions] = useState(quiz.shuffleQuestions);
  const [shuffleOptions, setShuffleOptions] = useState(quiz.shuffleOptions);
  const [timeLimitEnabled, setTimeLimitEnabled] = useState(!!quiz.timeLimitMinutes);
  const [timeLimitMinutesVal, setTimeLimitMinutesVal] = useState(quiz.timeLimitMinutes ?? 30);

  async function handleSave(publish: boolean) {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/quiz/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: quiz.id,
          title,
          description,
          publish,
          closed: isClosed,
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

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to save quiz");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      setIsPublished(publish);
      setIsClosed(isClosed);

      if (publish) {
        router.push("/instructor/quizzes");
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      alert("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  async function handleViewAnalytics() {
    setAnalyticsOpen(true);
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    setAnalyticsData([]);
    try {
      const res = await fetch(`/api/quiz/${encodeURIComponent(quiz.id)}/analytics`, {
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAnalyticsError(
          typeof data.error === "string" ? data.error : `Could not load analytics (${res.status})`
        );
        setAnalyticsData([]);
        return;
      }
      setAnalyticsData(Array.isArray(data.results) ? data.results : []);
    } catch {
      setAnalyticsError("Network error while loading analytics");
      setAnalyticsData([]);
    } finally {
      setAnalyticsLoading(false);
    }
  }

  function handleTogglePublish() {
    setIsPublished((value) => !value);
    setSaved(false);
  }

  function handleToggleClosed() {
    setIsClosed((value) => !value);
    setSaved(false);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/quiz/${quiz.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/instructor/quizzes");
        router.refresh();
      } else {
        alert("Failed to delete quiz");
        setDeleting(false);
      }
    } catch {
      alert("An error occurred");
      setDeleting(false);
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
    setGlobalCollapsed(false);
  }

  function handleShuffleQuestionsToggle() {
    setShuffleQuestions(!shuffleQuestions);
  }

  function handleShuffleOptionsToggle() {
    setShuffleOptions(!shuffleOptions);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <style>{`
      .eq-delete-btn {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background-color: rgb(177, 24, 24);
        border: none;
        font-weight: 600;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-shadow: 0px 0px 20px rgba(0,0,0,0.164);
        cursor: pointer;
        transition-duration: 0.3s;
        overflow: hidden;
        position: relative;
        gap: 1px;
        flex-shrink: 0;
        scale:0.9;
      }
      .eq-delete-slot {
        width: 120px;
        display: flex;
        justify-content: center;
        align-items: center;
        flex-shrink: 0;
      }
      .eq-delete-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .eq-delete-btn .eq-svgIcon { width: 12px; transition-duration: 0.3s; }
      .eq-delete-btn .eq-svgIcon path { fill: white; }
      .eq-delete-btn:not(:disabled):hover {
        width: 120px;
        border-radius: 50px;
        background-color: rgb(255, 69, 69);
        align-items: center;
        gap: 0;
      }
      .eq-delete-btn:not(:disabled):hover .eq-bin-bottom {
        width: 50px;
        transform: translateY(60%);
      }
      .eq-delete-btn .eq-bin-top { transform-origin: bottom right; }
      .eq-delete-btn:not(:disabled):hover .eq-bin-top {
        width: 50px;
        transform: translateY(60%) rotate(160deg);
      }
      .eq-delete-btn::before {
        position: absolute;
        top: -20px;
        content: "Delete";
        color: white;
        transition-duration: 0.3s;
        font-size: 2px;
      }
      .eq-delete-btn:not(:disabled):hover::before {
        font-size: 13px;
        opacity: 1;
        transform: translateY(35px);
      }

      .eq-action-btn {
        font-family: inherit;
        padding: 0.5em 1.1em;
        font-weight: 900;
        font-size: 14px;
        border: 3px solid currentColor;
        border-radius: 0.4em;
        box-shadow: 0.1em 0.1em;
        cursor: pointer;
        transition: transform 120ms ease, box-shadow 120ms ease;
      }

      .eq-action-btn:hover {
        transform: translate(-0.05em, -0.05em);
        box-shadow: 0.15em 0.15em;
      }

      .eq-action-btn:active {
        transform: translate(0.05em, 0.05em);
        box-shadow: 0.05em 0.05em;
      }

      .eq-action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
        box-shadow: 0.1em 0.1em;
      }

      .eq-action-btn-primary {
        color: white;
        border-color: #5b21b6;
        background: linear-gradient(135deg, #8b5cf6, #0ea5e9);
        box-shadow: 0.12em 0.12em 0 #4c1d95, 0 10px 22px rgba(59, 130, 246, 0.28);
        position: relative;
        overflow: hidden;
      }

      .eq-action-btn-primary::after {
        content: "";
        position: absolute;
        top: -40%;
        left: -30%;
        width: 46%;
        height: 180%;
        background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.38), transparent);
        transform: rotate(20deg);
        pointer-events: none;
      }

      .eq-action-btn-primary:hover {
        box-shadow: 0.16em 0.16em 0 #4c1d95, 0 14px 28px rgba(59, 130, 246, 0.35);
        filter: saturate(1.06) brightness(1.03);
      }

      .eq-action-btn-primary:active {
        box-shadow: 0.06em 0.06em 0 #4c1d95, 0 8px 16px rgba(59, 130, 246, 0.25);
      }

      .eq-delete-mobile-label {
        display: none;
      }

      @media (max-width: 640px) {
        .eq-delete-slot {
          width: auto;
        }

        .eq-delete-btn {
          width: auto;
          height: auto;
          min-height: 44px;
          border-radius: 0.4em;
          background-color: rgb(254, 242, 242);
          color: rgb(185, 28, 28);
          border: 3px solid currentColor;
          box-shadow: 0.1em 0.1em;
          padding: 0.5em 1.1em;
          display: inline-flex;
          flex-direction: row;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          scale: 1;
        }

        .eq-delete-btn::before {
          content: "";
        }

        .eq-delete-btn .eq-svgIcon {
          display: none;
        }

        .eq-delete-mobile-label {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          font-size: 14px;
          font-weight: 900;
          line-height: 1;
        }

        .eq-delete-btn:not(:disabled):hover {
          transform: translate(-0.05em, -0.05em);
          box-shadow: 0.15em 0.15em;
          background-color: rgb(254, 226, 226);
          width: auto;
          border-radius: 0.4em;
        }

        .eq-delete-btn:not(:disabled):active {
          transform: translate(0.05em, 0.05em);
          box-shadow: 0.05em 0.05em;
        }
      }
    `}</style>
      {/* Back nav */}
      <Link
        href="/instructor/quizzes"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Quizzes
      </Link>

      {/* Page title + action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:gap-3 bg-white p-4 sm:p-0 rounded-2xl sm:rounded-none sm:bg-transparent border border-black/5 sm:border-none shadow-sm sm:shadow-none">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">Edit Quiz</h1>
            <p className="text-sm text-gray-500 truncate">
              {isPublished ? (
                <span className="text-green-600 font-semibold">● Published</span>
              ) : (
                <span className="text-amber-500 font-semibold">● Draft</span>
              )}
              {isClosed && <span className="text-gray-500 font-semibold">{" · "}Closed</span>}
              {" · "}{questions.length} questions
            </p>
          </div>
        </div>
        {/* Header action buttons */}
        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
          <button
            type="button"
            onClick={handleViewAnalytics}
            className="eq-action-btn flex items-center gap-2 text-blue-700 bg-blue-50 hover:bg-blue-100"
          >
            <BarChart2 className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={handleToggleClosed}
            disabled={saving}
            className={`eq-action-btn flex items-center gap-2 transition-colors ${isClosed
              ? "text-gray-700 bg-gray-100 hover:bg-gray-200"
              : "text-green-700 bg-green-50 hover:bg-green-100"
              }`}
            style={isClosed
              ? { color: "#4b5563", background: "rgb(243,244,246)" }
              : { color: "#15803d", background: "rgb(240,253,244)" }
            }
            title={isClosed ? "Students see this quiz as closed" : "Students can open this quiz when published and available"}
          >
            {isClosed ? <X className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {isClosed ? "Closed" : "Open"}
          </button>
          <button
            onClick={handleTogglePublish}
            disabled={saving}
            className={`eq-action-btn flex items-center gap-2 transition-colors ${isPublished
              ? "text-amber-700 bg-amber-50 hover:bg-amber-100"
              : "text-green-700 bg-green-50 hover:bg-green-100"
              }`}
            style={isPublished
              ? { color: "#a16207", background: "rgb(254,252,232)" }
              : { color: "#15803d", background: "rgb(240,253,244)" }
            }
          >
            {isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isPublished ? "Set Draft" : "Set Published"}
          </button>
          <div className="eq-delete-slot">
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={deleting}
              className="eq-delete-btn"
              title="Delete Quiz"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin text-red-600 sm:text-white" />
              ) : (
                <>
                  <span className="eq-delete-mobile-label">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 69 14" className="eq-svgIcon eq-bin-top">
                    <g clipPath="url(#eq-clip-top)">
                      <path fill="black" d="M20.8232 2.62734L19.9948 4.21304C19.8224 4.54309 19.4808 4.75 19.1085 4.75H4.92857C2.20246 4.75 0 6.87266 0 9.5C0 12.1273 2.20246 14.25 4.92857 14.25H64.0714C66.7975 14.25 69 12.1273 69 9.5C69 6.87266 66.7975 4.75 64.0714 4.75H49.8915C49.5192 4.75 49.1776 4.54309 49.0052 4.21305L48.1768 2.62734C47.3451 1.00938 45.6355 0 43.7719 0H25.2281C23.3645 0 21.6549 1.00938 20.8232 2.62734ZM64.0023 20.0648C64.0397 19.4882 63.5822 19 63.0044 19H5.99556C5.4178 19 4.96025 19.4882 4.99766 20.0648L8.19375 69.3203C8.44018 73.0758 11.6746 76 15.5712 76H53.4288C57.3254 76 60.5598 73.0758 60.8062 69.3203L64.0023 20.0648Z" />
                    </g>
                    <defs><clipPath id="eq-clip-top"><rect fill="white" height="14" width="69" /></clipPath></defs>
                  </svg>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 69 57" className="eq-svgIcon eq-bin-bottom">
                    <g clipPath="url(#eq-clip-bottom)">
                      <path fill="black" d="M20.8232 -16.3727L19.9948 -14.787C19.8224 -14.4569 19.4808 -14.25 19.1085 -14.25H4.92857C2.20246 -14.25 0 -12.1273 0 -9.5C0 -6.8727 2.20246 -4.75 4.92857 -4.75H64.0714C66.7975 -4.75 69 -6.8727 69 -9.5C69 -12.1273 66.7975 -14.25 64.0714 -14.25H49.8915C49.5192 -14.25 49.1776 -14.4569 49.0052 -14.787L48.1768 -16.3727C47.3451 -17.9906 45.6355 -19 43.7719 -19H25.2281C23.3645 -19 21.6549 -17.9906 20.8232 -16.3727ZM64.0023 1.0648C64.0397 0.4882 63.5822 0 63.0044 0H5.99556C5.4178 0 4.96025 0.4882 4.99766 1.0648L8.19375 50.3203C8.44018 54.0758 11.6746 57 15.5712 57H53.4288C57.3254 57 60.5598 54.0758 60.8062 50.3203L64.0023 1.0648Z" />
                    </g>
                    <defs><clipPath id="eq-clip-bottom"><rect fill="white" height="57" width="69" /></clipPath></defs>
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Meta fields */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quiz Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter your quiz title"
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-black/5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-300 transition-all font-medium text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description (optional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of the quiz content"
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-black/5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-300 transition-all font-medium text-sm"
          />
        </div>
      </div>

      <QuizAccessSettings
        variant="light"
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
        hasExistingPassword={quiz.hasAccessPassword}
        allowMultipleAttempts={allowMultipleAttempts}
        onAllowMultipleAttempts={setAllowMultipleAttempts}
        timeLimitEnabled={timeLimitEnabled}
        onTimeLimitEnabled={setTimeLimitEnabled}
        timeLimitMinutes={timeLimitMinutesVal}
        onTimeLimitMinutes={setTimeLimitMinutesVal}
      />

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4 flex flex-col xl:flex-row xl:items-center gap-4">
        {/* Tools */}
        <div className="flex flex-wrap sm:flex-nowrap border border-black/10 rounded-xl sm:rounded-full overflow-hidden shadow-sm flex-shrink-0">
          <button
            onClick={() => {
              setGlobalCollapsed((prev) => !prev);
              setActiveQuestion(-1);
              setExpandedMap({});
            }}
            className="px-4 py-2 cursor-pointer text-[13px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap flex-grow sm:flex-grow-0"
          >
            {globalCollapsed ? <UnfoldVertical className="w-4 h-4" /> : <FoldVertical className="w-4 h-4" />}
            <span className="hidden sm:inline">{globalCollapsed ? "Expand All" : "Collapse All"}</span>
            <span className="sm:hidden">{globalCollapsed ? "Expand" : "Collapse"}</span>
          </button>
          <div className="w-full h-px sm:w-px sm:h-auto bg-black/10 hidden sm:block" />
          <button
            onClick={handleShuffleQuestionsToggle}
            className={`px-4 py-2 cursor-pointer text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap flex-grow sm:flex-grow-0 border-t sm:border-t-0 sm:border-l border-black/10 ${shuffleQuestions ? "bg-green-100 text-green-700 hover:bg-green-200" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}
            title="Shuffle question order for students"
          >
            <Shuffle className="w-4 h-4" /> Mix Qs
          </button>
          <div className="w-full h-px sm:w-px sm:h-auto bg-black/10 hidden sm:block" />
          <button
            onClick={handleShuffleOptionsToggle}
            className={`px-4 py-2 text-[13px] cursor-pointer font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap flex-grow sm:flex-grow-0 border-t sm:border-t-0 sm:border-l border-black/10 ${shuffleOptions ? "bg-green-100 text-green-700 hover:bg-green-200" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"}`}
            title="Shuffle A/B/C/D options for students"
          >
            <Shuffle className="w-4 h-4" /> <span className="hidden sm:inline">Mix Options</span><span className="sm:hidden">Options</span>
          </button>
        </div>

        <div className="flex-1 hidden xl:block" />

        {/* Save actions */}
        <div className="flex items-center gap-2 flex-wrap xl:flex-shrink-0 justify-center sm:justify-start">
          {saved && (
            <span className="flex items-center gap-1.5 text-green-600 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Saved!
            </span>
          )}
          <button
            onClick={() => handleSave(isPublished)}
            disabled={saving || questions.length === 0}
            className={`eq-action-btn flex items-center gap-2 ${isPublished
              ? "eq-action-btn-primary"
              : "text-gray-700 bg-white hover:bg-gray-50"
              }`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isPublished ? (
              <Send className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isPublished ? "Save & Publish" : "Save Draft"}
          </button>
        </div>
      </div>

      {/* Question list */}
      <div className="space-y-3">
        {questions.map((q, i) => (
          <div
            key={i}
            ref={el => { questionRefs.current[i] = el; }}
            id={`question-${i}`}
          >
            <QuestionEditor
              question={q}
              index={i}
              globalCollapsed={activeQuestion === i ? false : (expandedMap[i] === true ? false : globalCollapsed)}
              onChange={(idx, updated) => {
                handleQuestionChange(idx, updated);
              }}
              onDelete={handleDeleteQuestion}
            />
          </div>
        ))}
      </div>

      {/* Add question */}
      {/* ── Edit Sidebar (same slide-over as ReviewSidebar / QuizTaker) ── */}
      {mounted && questions.length > 0 && createPortal(
        <>
          {/* Toggle tab */}
          <div
            className="fixed z-50"
            style={{
              right: sidebarOpen ? "260px" : "0px",
              top: "calc(88px + 96px)",
              transition: "right 300ms cubic-bezier(0.4,0,0.2,1)",
              willChange: "right",
            }}
          >
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="w-8 h-14 bg-white border border-black/10 border-r-0 rounded-l-xl shadow-[-6px_0_12px_rgba(0,0,0,0.04)] flex items-center justify-center text-gray-400 hover:text-purple-600 transition-colors"
              aria-label={sidebarOpen ? "Hide question panel" : "Show question panel"}
            >
              {sidebarOpen ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>

          {/* Sliding panel */}
          <div
            className="fixed right-0 top-[88px] bottom-0 z-40 flex items-start py-6"
            style={{
              width: "260px",
              transform: sidebarOpen ? "translateX(0)" : "translateX(100%)",
              transition: "transform 300ms cubic-bezier(0.4,0,0.2,1)",
              willChange: "transform",
            }}
          >
            <div className="w-[calc(100%-24px)] h-full bg-white/80 backdrop-blur-xl rounded-l-3xl border border-black/5 border-r-0 shadow-[-10px_0_30px_rgba(0,0,0,0.05)] overflow-y-auto px-5 py-6 no-scrollbar relative overflow-hidden">
              <div className="space-y-4 relative z-10">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Questions</h3>

                <div className="grid grid-cols-5 gap-1.5">
                  {questions.map((q, i) => {
                    const filled = !!q.questionText?.trim();
                    const isActive = activeQuestion === i;
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          setActiveQuestion(i);
                          setExpandedMap(prev => ({ ...prev, [i]: true }));
                          setGlobalCollapsed(true);
                          setSidebarOpen(false);
                          setTimeout(() => {
                            const el = document.getElementById(`question-${i}`);
                            const scrollArea = document.getElementById("dashboard-scroll-area");
                            if (el && scrollArea) {
                              const scrollAreaRect = scrollArea.getBoundingClientRect();
                              const elRect = el.getBoundingClientRect();
                              scrollArea.scrollTo({ top: scrollArea.scrollTop + (elRect.top - scrollAreaRect.top) - 24, behavior: "smooth" });
                            } else if (el) {
                              el.scrollIntoView({ behavior: "smooth", block: "center" });
                            }
                          }, 50);
                        }}
                        className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all duration-150 hover:scale-105 ${isActive
                          ? "bg-purple-600 text-white border-purple-700 shadow-sm ring-2 ring-purple-400/40 ring-offset-1"
                          : filled
                            ? "bg-purple-100 text-purple-700 border-purple-200"
                            : "bg-gray-100 text-gray-500 border-black/5"
                          }`}
                        title={`Question ${i + 1}: ${filled ? "filled" : "empty"}`}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="space-y-1.5 pt-4 border-t border-gray-100">
                  {[
                    { color: "bg-purple-600", label: `Active` },
                    { color: "bg-purple-100 border border-purple-200", label: `Filled (${questions.filter(q => q.questionText?.trim()).length})` },
                    { color: "bg-gray-200", label: `Empty (${questions.filter(q => !q.questionText?.trim()).length})` },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-sm flex-shrink-0 ${color} shadow-sm`} />
                      <span className="text-xs text-gray-500 font-medium">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white rounded-2xl border border-black/5 shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Delete Quiz?</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Are you sure you want to permanently delete <span className="font-bold text-gray-700">&quot;{title || "this quiz"}&quot;</span>? This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 rounded-xl border border-black/10 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-red-600/20"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Yes, Delete
                    </>
                  )}
                </button>
              </div>
            </div>
            {/* Subtle red accent line at top */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-rose-500" />
          </div>
        </div>,
        document.body
      )}

      <button
        onClick={handleAddQuestion}
        className="w-full py-4 rounded-xl border-2 border-dashed border-black/10 text-gray-400 hover:border-purple-400/50 hover:text-purple-600 transition-all flex items-center justify-center gap-2 text-sm font-semibold bg-white/60 hover:bg-white"
      >
        <Plus className="w-5 h-5" /> Add Question
      </button>

      {/* Analytics Modal — portal + min-h-[100dvh] keeps it centered when the page is scrolled */}
      {analyticsOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="analytics-modal-title"
          >
            <div
              className="min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-sm"
              onClick={() => {
                setAnalyticsOpen(false);
                setAnalyticsError(null);
              }}
            >
              <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[min(85vh,100dvh-2rem)] flex flex-col border border-black/5 my-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <BarChart2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 id="analytics-modal-title" className="text-lg font-bold text-gray-900">
                        Quiz Analytics
                      </h2>
                      <p className="text-sm text-gray-500">
                        {analyticsData.length} attempt{analyticsData.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAnalyticsOpen(false);
                      setAnalyticsError(null);
                    }}
                    className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-gray-500 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Modal body */}
                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                  {analyticsLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    </div>
                  ) : analyticsError ? (
                    <div className="text-center py-16 px-4">
                      <p className="text-red-600 font-medium text-sm">{analyticsError}</p>
                      <p className="text-gray-400 text-xs mt-2">
                        Check that you own this quiz and are signed in as an instructor.
                      </p>
                    </div>
                  ) : analyticsData.length === 0 ? (
                    <div className="text-center py-16">
                      <BarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">No attempts yet</p>
                      <p className="text-sm text-gray-400 mt-1">Students haven&apos;t taken this quiz yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-3 mb-6">
                        <div className="bg-blue-50 rounded-2xl p-4 text-center border border-blue-100">
                          <p className="text-2xl font-bold text-blue-600">{analyticsData.length}</p>
                          <p className="text-xs text-blue-500 font-semibold mt-1">Total Attempts</p>
                        </div>
                        <div className="bg-green-50 rounded-2xl p-4 text-center border border-green-100">
                          <p className="text-2xl font-bold text-green-600">
                            {analyticsData.length > 0
                              ? Math.round(
                                analyticsData.reduce((s, r) => s + r.percentage, 0) / analyticsData.length
                              )
                              : 0}
                            %
                          </p>
                          <p className="text-xs text-green-500 font-semibold mt-1">Avg Score</p>
                        </div>
                        <div className="bg-purple-50 rounded-2xl p-4 text-center border border-purple-100">
                          <p className="text-2xl font-bold text-purple-600">
                            {analyticsData.length > 0 ? Math.max(...analyticsData.map((r) => r.percentage)) : 0}%
                          </p>
                          <p className="text-xs text-purple-500 font-semibold mt-1">Top Score</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-black/5 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Student
                              </th>
                              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Score
                              </th>
                              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Duration
                              </th>
                              <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                Submitted
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {analyticsData.map((r) => (
                              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="relative w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 overflow-hidden ring-1 ring-purple-200/70">
                                      {r.profileImageUrl ? (
                                        <>
                                          <span aria-hidden="true" className="absolute inset-0 bg-[#F6F1E8]" />
                                          <span
                                            aria-hidden="true"
                                            className="relative h-full w-full bg-cover bg-center"
                                            style={{ backgroundImage: `url("${r.profileImageUrl}")` }}
                                          />
                                        </>
                                      ) : (
                                        <span className="text-xs font-bold text-purple-600">
                                          {r.studentName?.[0]?.toUpperCase() ?? "?"}
                                        </span>
                                      )}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-gray-900 text-xs">{r.studentName}</p>
                                      <p className="text-gray-400 text-xs">@{r.username}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.percentage >= 75
                                        ? "bg-green-100 text-green-700"
                                        : r.percentage >= 50
                                          ? "bg-yellow-100 text-yellow-700"
                                          : "bg-red-100 text-red-700"
                                        }`}
                                    >
                                      {r.percentage}%
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {r.score}/{r.totalQuestions}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
                                    <Clock className="w-3 h-3 flex-shrink-0" />
                                    {Math.floor((r.timeTaken || 0) / 60)}m {(r.timeTaken || 0) % 60}s
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-xs text-gray-600 leading-snug">
                                    <span className="font-medium text-gray-800">
                                      {formatAppTime(r.submittedAt)}
                                    </span>
                                    <span className="text-gray-400 mx-1">·</span>
                                    <span className="text-gray-500">
                                      {formatAppDate(r.submittedAt)}
                                    </span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
