"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import QuestionEditor, { QuestionData, createBlankQuestion } from "@/components/quiz/QuestionEditor";
import {
  Save, Send, Loader2, Plus, UnfoldVertical, FoldVertical,
  Shuffle, RotateCcw, ArrowLeft, BookOpen, CheckCircle2,
  Trash2, EyeOff, Eye, BarChart2, X, Clock, Award, User
} from "lucide-react";
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
    quiz.questions.map((q) => ({
      id: q.id,
      questionText: q.questionText,
      options: q.options as { A: string; B: string; C: string; D: string },
      correctAnswer: q.correctAnswer as "A" | "B" | "C" | "D",
      explanation: q.explanation || "",
      order: q.order,
    }))
  );

  const [originalQuestions] = useState<QuestionData[]>([...questions]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [isPublished, setIsPublished] = useState(quiz.isPublished);
  const [globalCollapsed, setGlobalCollapsed] = useState(true);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

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
          questions,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to save quiz");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);

      if (publish) {
        setIsPublished(true);
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
    try {
      const res = await fetch(`/api/quiz/${quiz.id}/analytics`);
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data.results);
      }
    } catch {
      /* silent */
    } finally {
      setAnalyticsLoading(false);
    }
  }

  async function handleTogglePublish() {
    setToggling(true);
    try {
      const res = await fetch(`/api/quiz/${quiz.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !isPublished }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsPublished(data.isPublished);
      } else {
        alert("Failed to update quiz status");
      }
    } catch {
      alert("An error occurred");
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to permanently delete this quiz? This cannot be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/quiz/${quiz.id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/instructor/quizzes");
        router.refresh();
      } else {
        alert("Failed to delete quiz");
      }
    } catch {
      alert("An error occurred");
    } finally {
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

  function shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function handleShuffleQuestions() {
    setQuestions((prev) => shuffleArray(prev).map((q, i) => ({ ...q, order: i })));
  }

  function handleShuffleOptions() {
    setQuestions((prev) =>
      prev.map((q) => {
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
          if (o.key === q.correctAnswer) newCorrectAnswer = newKey;
        });
        return { ...q, options: newOptions, correctAnswer: newCorrectAnswer as "A" | "B" | "C" | "D" };
      })
    );
  }

  function handleResetShuffles() {
    setQuestions([...originalQuestions]);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <style>{`
      .eq-delete-btn {
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background-color: rgb(153, 27, 27);
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
    `}</style>
      {/* Back nav */}
      <Link
        href="/instructor/quizzes"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to My Quizzes
      </Link>

      {/* Page title + action buttons */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
          <BookOpen className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">Edit Quiz</h1>
          <p className="text-sm text-gray-500">
            {isPublished ? (
              <span className="text-green-600 font-semibold">● Published</span>
            ) : (
              <span className="text-amber-500 font-semibold">● Draft</span>
            )}
            {" · "}{questions.length} questions
          </p>
        </div>
        {/* Header action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleViewAnalytics}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold border border-blue-200 text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
          >
            <BarChart2 className="w-4 h-4" /> View Analytics
          </button>
          <button
            onClick={handleTogglePublish}
            disabled={toggling || saving}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold border transition-colors disabled:opacity-50"
            style={isPublished
              ? { borderColor: "rgba(234,179,8,0.4)", color: "#a16207", background: "rgb(254,252,232)" }
              : { borderColor: "rgba(34,197,94,0.3)", color: "#15803d", background: "rgb(240,253,244)" }
            }
          >
            {toggling ? <Loader2 className="w-4 h-4 animate-spin" /> : isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isPublished ? "Unpublish" : "Republish"}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="eq-delete-btn"
            title="Delete Quiz"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <>
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

      {/* Meta fields */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-6 space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Quiz Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chapter 3: Cell Biology"
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

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4 flex items-center gap-3 flex-wrap">
        {/* Tools */}
        <div className="flex border border-black/10 rounded-full overflow-hidden shadow-sm flex-shrink-0">
          <button
            onClick={() => setGlobalCollapsed((prev) => !prev)}
            className="px-4 py-2 text-[13px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            {globalCollapsed ? <UnfoldVertical className="w-4 h-4" /> : <FoldVertical className="w-4 h-4" />}
            {globalCollapsed ? "Expand All" : "Collapse All"}
          </button>
          <div className="w-px bg-black/10" />
          <button
            onClick={handleShuffleQuestions}
            className="px-4 py-2 text-[13px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <Shuffle className="w-4 h-4" /> Mix Qs
          </button>
          <div className="w-px bg-black/10" />
          <button
            onClick={handleShuffleOptions}
            className="px-4 py-2 text-[13px] font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <Shuffle className="w-4 h-4" /> Mix Options
          </button>
          <div className="w-px bg-black/10" />
          <button
            onClick={handleResetShuffles}
            className="px-4 py-2 text-[13px] font-semibold text-red-400 hover:text-red-600 hover:bg-red-50 transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>

        <div className="flex-1" />

        {/* Save actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {saved && (
            <span className="flex items-center gap-1.5 text-green-600 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Saved!
            </span>
          )}
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-bold border border-black/10 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || questions.length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-bold text-white shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, hsl(262 80% 65%), hsl(199 89% 48%))" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {quiz.isPublished ? "Save & Publish" : "Publish Quiz"}
          </button>
        </div>
      </div>

      {/* Question list */}
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
      <button
        onClick={handleAddQuestion}
        className="w-full py-4 rounded-xl border-2 border-dashed border-black/10 text-gray-400 hover:border-purple-400/50 hover:text-purple-600 transition-all flex items-center justify-center gap-2 text-sm font-semibold bg-white/60 hover:bg-white"
      >
        <Plus className="w-5 h-5" /> Add Question
      </button>

      {/* Analytics Modal */}
      {analyticsOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-black/5">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <BarChart2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Quiz Analytics</h2>
                  <p className="text-sm text-gray-500">{analyticsData.length} attempt{analyticsData.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <button
                onClick={() => setAnalyticsOpen(false)}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto p-6">
              {analyticsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : analyticsData.length === 0 ? (
                <div className="text-center py-16">
                  <BarChart2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No attempts yet</p>
                  <p className="text-sm text-gray-400 mt-1">Students haven't taken this quiz yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Summary stats */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="bg-blue-50 rounded-2xl p-4 text-center border border-blue-100">
                      <p className="text-2xl font-bold text-blue-600">{analyticsData.length}</p>
                      <p className="text-xs text-blue-500 font-semibold mt-1">Total Attempts</p>
                    </div>
                    <div className="bg-green-50 rounded-2xl p-4 text-center border border-green-100">
                      <p className="text-2xl font-bold text-green-600">
                        {analyticsData.length > 0 ? Math.round(analyticsData.reduce((s, r) => s + r.percentage, 0) / analyticsData.length) : 0}%
                      </p>
                      <p className="text-xs text-green-500 font-semibold mt-1">Avg Score</p>
                    </div>
                    <div className="bg-purple-50 rounded-2xl p-4 text-center border border-purple-100">
                      <p className="text-2xl font-bold text-purple-600">
                        {analyticsData.length > 0 ? Math.max(...analyticsData.map(r => r.percentage)) : 0}%
                      </p>
                      <p className="text-xs text-purple-500 font-semibold mt-1">Top Score</p>
                    </div>
                  </div>

                  {/* Attempts table */}
                  <div className="rounded-2xl border border-black/5 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                          <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Score</th>
                          <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Time</th>
                          <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Submitted</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {analyticsData.map((r) => (
                          <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold text-purple-600">{r.studentName?.[0]?.toUpperCase() ?? "?"}</span>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 text-xs">{r.studentName}</p>
                                  <p className="text-gray-400 text-xs">{r.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.percentage >= 75 ? "bg-green-100 text-green-700" :
                                  r.percentage >= 50 ? "bg-yellow-100 text-yellow-700" :
                                    "bg-red-100 text-red-700"
                                  }`}>
                                  {r.percentage}%
                                </span>
                                <span className="text-xs text-gray-500">{r.score}/{r.totalQuestions}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-1 text-xs text-gray-600">
                                <Clock className="w-3 h-3" />
                                {Math.floor((r.timeTaken || 0) / 60)}m {(r.timeTaken || 0) % 60}s
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-gray-500">
                                {new Date(r.submittedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                              </span>
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
      )}
    </div>
  );
}
