"use client";

import { useEffect, useRef, useState, useMemo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, ExternalLink, Link2, Loader2, Pencil, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import PaginationControls from "@/components/ui/PaginationControls";

const DEFAULT_PAGE_SIZE = 20;

export interface AdminSlugAlias {
  id: string;
  slug: string;
  createdAt: string;
}

export interface AdminSlugQuiz {
  id: string;
  title: string;
  isPublished: boolean;
  shareSlug: string | null;
  createdBy: {
    fullName: string;
    username: string;
  };
  aliases: AdminSlugAlias[];
}

function getOrigin() {
  return typeof window === "undefined" ? "" : window.location.origin;
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getErrorMessage(data: unknown, fallback: string) {
  return typeof data === "object" && data !== null && "error" in data && typeof data.error === "string"
    ? data.error
    : fallback;
}

function SlugTooltip({
  children,
  className = "",
  text,
}: {
  children: ReactNode;
  className?: string;
  text: string;
}) {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const openedByPointerRef = useRef(false);
  const [position, setPosition] = useState<{
    left: number;
    placement: "top" | "bottom";
    top: number;
  } | null>(null);

  function showTooltip(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const horizontalMargin = Math.min(180, Math.max(16, window.innerWidth / 2 - 16));
    const left = Math.min(Math.max(rect.left + rect.width / 2, horizontalMargin), window.innerWidth - horizontalMargin);
    const hasSpaceAbove = rect.top > 92;

    setPosition({
      left,
      placement: hasSpaceAbove ? "top" : "bottom",
      top: hasSpaceAbove ? rect.top - 10 : rect.bottom + 10,
    });
  }

  useEffect(() => {
    if (!position) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      if (triggerRef.current?.contains(event.target as Node)) return;
      setPosition(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setPosition(null);
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [position]);

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        className={`cursor-help touch-manipulation outline-none ${className}`}
        onPointerDown={(event) => {
          if (event.pointerType !== "mouse") {
            event.preventDefault();
            openedByPointerRef.current = true;
            if (position) {
              setPosition(null);
            } else {
              showTooltip(event.currentTarget);
            }
          }
        }}
        onFocus={(event) => {
          if (!openedByPointerRef.current) {
            showTooltip(event.currentTarget);
          }
          openedByPointerRef.current = false;
        }}
        onBlur={() => {
          if (!openedByPointerRef.current) {
            setPosition(null);
          }
        }}
        onMouseEnter={(event) => showTooltip(event.currentTarget)}
        onMouseLeave={() => setPosition(null)}
        aria-label={text}
      >
        {children}
      </span>
      {position &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className={`pointer-events-none fixed z-[10000] max-w-[min(520px,calc(100vw-32px))] rounded-2xl border border-white/15 bg-[#1F1B19]/95 px-4 py-3 text-xs font-bold leading-relaxed text-white shadow-[0_18px_45px_rgba(31,27,25,0.24)] ring-1 ring-black/10 backdrop-blur-md ${
              position.placement === "top" ? "-translate-x-1/2 -translate-y-full" : "-translate-x-1/2"
            }`}
            style={{ left: position.left, top: position.top }}
            role="tooltip"
          >
            <span className="block break-all">{text}</span>
            <span
              className={`absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-white/15 bg-[#1F1B19]/95 ${
                position.placement === "top"
                  ? "-bottom-1.5 border-b border-r"
                  : "-top-1.5 border-l border-t"
              }`}
            />
          </div>,
          document.body
        )}
    </>
  );
}

export default function SlugManagementTable({ initialQuizzes }: { initialQuizzes: AdminSlugQuiz[] }) {
  const [quizzes, setQuizzes] = useState(initialQuizzes);
  const [query, setQuery] = useState("");
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [draftSlug, setDraftSlug] = useState("");
  const [savingQuizId, setSavingQuizId] = useState<string | null>(null);
  const [deletingAliasId, setDeletingAliasId] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const filteredQuizzes = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return quizzes;

    return quizzes.filter((quiz) => {
      const aliases = quiz.aliases.map((alias) => alias.slug).join(" ");
      return `${quiz.title} ${quiz.shareSlug ?? ""} ${aliases} ${quiz.createdBy.username} ${quiz.createdBy.fullName}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [query, quizzes]);

  const effectivePageSize = pageSize === Infinity ? filteredQuizzes.length || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(filteredQuizzes.length / effectivePageSize));
  const page = Math.min(currentPage, totalPages);
  const pageStartIndex = (page - 1) * effectivePageSize;
  const paginatedQuizzes = filteredQuizzes.slice(pageStartIndex, pageStartIndex + effectivePageSize);
  const startItem = filteredQuizzes.length === 0 ? 0 : pageStartIndex + 1;
  const endItem = Math.min(pageStartIndex + paginatedQuizzes.length, filteredQuizzes.length);

  function goToPreviousPage() {
    setCurrentPage((value) => Math.max(1, Math.min(value, totalPages) - 1));
  }

  function goToNextPage() {
    setCurrentPage((value) => Math.min(totalPages, Math.min(value, totalPages) + 1));
  }

  function updateQuery(value: string) {
    setQuery(value);
    setCurrentPage(1);
  }

  function updatePageSize(nextPageSize: number) {
    setPageSize(nextPageSize);
    setCurrentPage(1);
  }

  function beginEdit(quiz: AdminSlugQuiz) {
    setEditingQuizId(quiz.id);
    setDraftSlug(quiz.shareSlug ?? "");
  }

  function cancelEdit() {
    setEditingQuizId(null);
    setDraftSlug("");
  }

  async function copyPath(path: string, key: string) {
    const href = `${getOrigin()}${path}`;
    try {
      await navigator.clipboard.writeText(href);
    } catch {
      const input = document.createElement("input");
      input.value = href;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }

    setCopiedKey(key);
    window.setTimeout(() => setCopiedKey(null), 1400);
    toast.success("Share link copied");
  }

  async function saveSlug(quizId: string) {
    if (savingQuizId) return;
    setSavingQuizId(quizId);

    try {
      const res = await fetch(`/api/admin/slugs/${encodeURIComponent(quizId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug: draftSlug }),
      });
      const data: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(getErrorMessage(data, "Could not update slug"));
        return;
      }

      if (
        typeof data === "object" &&
        data !== null &&
        "id" in data &&
        typeof data.id === "string" &&
        "shareSlug" in data &&
        typeof data.shareSlug === "string" &&
        "aliases" in data &&
        Array.isArray(data.aliases)
      ) {
        const updatedQuizId = data.id;
        const updatedShareSlug = data.shareSlug;
        const aliases = data.aliases.filter((alias): alias is AdminSlugAlias => {
          return (
            typeof alias === "object" &&
            alias !== null &&
            "id" in alias &&
            typeof alias.id === "string" &&
            "slug" in alias &&
            typeof alias.slug === "string" &&
            "createdAt" in alias &&
            typeof alias.createdAt === "string"
          );
        });

        setQuizzes((current) =>
          current.map((quiz) =>
            quiz.id === updatedQuizId
              ? {
                  ...quiz,
                  shareSlug: updatedShareSlug,
                  aliases,
                }
              : quiz
          )
        );
        setEditingQuizId(null);
        setDraftSlug("");
        toast.success("Share slug updated");
      }
    } catch {
      toast.error("Network error while updating slug");
    } finally {
      setSavingQuizId(null);
    }
  }

  async function deleteAlias(aliasId: string) {
    if (deletingAliasId) return;
    setDeletingAliasId(aliasId);

    try {
      const res = await fetch(`/api/admin/slugs/aliases/${encodeURIComponent(aliasId)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        toast.error(getErrorMessage(data, "Could not delete old slug"));
        return;
      }

      if (
        typeof data === "object" &&
        data !== null &&
        "id" in data &&
        typeof data.id === "string" &&
        "quizId" in data &&
        typeof data.quizId === "string"
      ) {
        setQuizzes((current) =>
          current.map((quiz) =>
            quiz.id === data.quizId
              ? {
                  ...quiz,
                  aliases: quiz.aliases.filter((alias) => alias.id !== data.id),
                }
              : quiz
          )
        );
        toast.success("Old slug deleted");
      }
    } catch {
      toast.error("Network error while deleting old slug");
    } finally {
      setDeletingAliasId(null);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/82 p-5 shadow-[0_18px_48px_rgba(44,42,40,0.08)] ring-1 ring-[#E8E2D8]/80 backdrop-blur-2xl sm:p-6">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
      <div className="relative z-10 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8C6D50]">Share links</p>
            <h2 className="mt-1 text-xl font-black text-[#1F1B19]">Slug management</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600">
              Edit current quiz share slugs and remove old alias links. Current slugs stay unique across all quizzes.
            </p>
          </div>

          <label className="relative block w-full lg:w-[360px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A09890]" />
            <input
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              className="h-12 w-full rounded-2xl border border-[#E4DDD3] bg-white/78 pl-11 pr-4 text-sm font-semibold text-[#2C2A28] shadow-[0_8px_26px_rgba(44,42,40,0.06)] outline-none transition-all placeholder:text-[#AFA69A] focus:border-violet-200 focus:bg-white focus:ring-4 focus:ring-violet-100/70"
              placeholder="Search title, slug, or creator"
              aria-label="Search quiz slugs"
            />
          </label>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#E8E2D8] bg-[#FFFDF9]/75">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] table-fixed">
              <colgroup>
                <col className="w-[25%]" />
                <col className="w-[32%]" />
                <col className="w-[28%]" />
                <col className="w-[15%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[#E4DDD3] bg-[#F0EBE2]/80">
                  {["Quiz", "Current slug", "Old aliases", "Actions"].map((label) => (
                    <th key={label} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.14em] text-[#8C6D50]">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedQuizzes.map((quiz) => {
                  const editing = editingQuizId === quiz.id;
                  const currentPath = quiz.shareSlug ? `/quiz/${quiz.shareSlug}` : `/student/quizzes/${quiz.id}`;

                  return (
                    <tr key={quiz.id} className="h-[227px] border-b border-[#EDE8E0] last:border-b-0">
                      <td className="px-4 py-5 align-top">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-black leading-snug text-[#1F1B19]">{quiz.title}</p>
                          <p className="mt-1 truncate text-xs font-semibold text-[#8C6D50]">
                            by {quiz.createdBy.fullName} @{quiz.createdBy.username}
                          </p>
                          <span
                            className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                              quiz.isPublished
                                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                                : "border-amber-100 bg-amber-50 text-amber-700"
                            }`}
                          >
                            {quiz.isPublished ? "Published" : "Draft"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-5 align-top">
                        {editing ? (
                          <div className="space-y-2">
                            <div className="flex items-center overflow-hidden rounded-2xl border border-violet-100 bg-white shadow-sm focus-within:ring-4 focus-within:ring-violet-100/70">
                              <span className="border-r border-[#E8E2D8] bg-[#F8F3EA] px-3 py-2 text-xs font-black text-[#8C6D50]">
                                /quiz/
                              </span>
                              <input
                                value={draftSlug}
                                onChange={(event) => setDraftSlug(event.target.value)}
                                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm font-bold text-[#1F1B19] outline-none"
                                aria-label={`Edit slug for ${quiz.title}`}
                              />
                            </div>
                            <p className="text-[11px] font-semibold text-slate-500">Spaces and symbols are normalized automatically.</p>
                          </div>
                        ) : (
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="inline-flex min-w-0 items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50 px-3 py-2 text-sm font-black text-violet-700">
                              <Link2 className="h-4 w-4 flex-shrink-0" />
                              <SlugTooltip text={currentPath} className="min-w-0">
                                <span className="block truncate">{currentPath}</span>
                              </SlugTooltip>
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-5 align-top">
                        {quiz.aliases.length === 0 ? (
                          <p className="text-xs font-semibold text-slate-400">No old aliases</p>
                        ) : (
                          <div className="flex max-h-[187px] flex-col gap-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-color:#C8BFB4_transparent] [scrollbar-width:thin]">
                            {quiz.aliases.map((alias) => (
                              <div key={alias.id} className="flex min-h-[57px] items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white/80 px-3 py-2">
                                <div className="min-w-0">
                                  <SlugTooltip text={`/quiz/${alias.slug}`} className="block min-w-0">
                                    <span className="block truncate text-xs font-black text-slate-700">/quiz/{alias.slug}</span>
                                  </SlugTooltip>
                                  <p className="text-[10px] font-semibold text-slate-400">Saved {displayDate(alias.createdAt)}</p>
                                </div>
                                <div className="flex flex-shrink-0 items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => copyPath(`/quiz/${alias.slug}`, `alias-${alias.id}`)}
                                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                                    title="Copy old alias"
                                    aria-label={`Copy alias ${alias.slug}`}
                                  >
                                    {copiedKey === `alias-${alias.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                  </button>
                                  <a
                                    href={`/quiz/${alias.slug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                                    title="Open old alias"
                                    aria-label={`Open alias ${alias.slug}`}
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => deleteAlias(alias.id)}
                                    disabled={deletingAliasId === alias.id}
                                    className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    title="Delete old alias"
                                    aria-label={`Delete alias ${alias.slug}`}
                                  >
                                    {deletingAliasId === alias.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-5 align-top">
                        <div className="flex flex-wrap gap-2">
                          {editing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => saveSlug(quiz.id)}
                                disabled={savingQuizId === quiz.id}
                                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {savingQuizId === quiz.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                              >
                                <X className="h-3.5 w-3.5" />
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => beginEdit(quiz)}
                                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-violet-100 bg-violet-50 px-3 text-xs font-black text-violet-700 transition hover:bg-violet-100"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => copyPath(currentPath, `current-${quiz.id}`)}
                                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                              >
                                {copiedKey === `current-${quiz.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                Copy
                              </button>
                              <a
                                href={currentPath}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 transition hover:bg-slate-50"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                Open
                              </a>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredQuizzes.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-black text-[#1F1B19]">No slugs found</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Try a different search term.</p>
            </div>
          )}
        </div>

        {filteredQuizzes.length > 0 && (
          <PaginationControls
            currentPage={page}
            endItem={endItem}
            onNext={goToNextPage}
            onPrevious={goToPreviousPage}
            startItem={startItem}
            totalItems={filteredQuizzes.length}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageSizeChange={updatePageSize}
          />
        )}
      </div>
    </section>
  );
}
