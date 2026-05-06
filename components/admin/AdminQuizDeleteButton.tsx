"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

export default function AdminQuizDeleteButton({
  quizId,
  quizTitle,
}: {
  quizId: string;
  quizTitle: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/quiz/${encodeURIComponent(quizId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(typeof data.error === "string" ? data.error : "Failed to delete quiz");
        setDeleting(false);
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      alert("Network error while deleting quiz");
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Delete ${quizTitle}`}
        title="Delete quiz"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-600 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-100 hover:text-red-700 hover:shadow-md active:translate-y-0"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !deleting && setOpen(false)}
            />
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-red-200 bg-white shadow-2xl">
              <div className="absolute inset-x-0 top-0 h-1 bg-red-600" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={deleting}
                className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="p-8">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                  <AlertTriangle className="h-7 w-7" />
                </div>
                <h3 className="mb-2 text-xl font-black text-gray-900">Delete Quiz?</h3>
                <p className="text-sm font-medium leading-relaxed text-gray-600">
                  Are you sure you want to permanently delete{" "}
                  <span className="font-bold text-gray-800">{quizTitle}</span>? This removes its questions, attempts, and active sessions. This action cannot be undone.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={deleting}
                    className="rounded-xl bg-gray-100 px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-200 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-red-200 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Yes, Delete
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
