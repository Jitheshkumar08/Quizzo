"use client";

import { Children, isValidElement, type DragEvent, type ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, GripVertical, Loader2, Pencil, RotateCcw, Save, X } from "lucide-react";

type DropTarget = {
  id: string;
  side: "before" | "after";
};

function reorder(ids: string[], draggedId: string, target: DropTarget) {
  const next = ids.filter((id) => id !== draggedId);
  const targetIndex = next.indexOf(target.id);
  if (targetIndex === -1) return ids;
  next.splice(target.side === "after" ? targetIndex + 1 : targetIndex, 0, draggedId);
  return next;
}

function getDropSide(event: DragEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  return event.clientX < rect.left + rect.width / 2 ? "before" : "after";
}

export default function AdminQuizOrderGrid({
  initialIds,
  isAdmin,
  canEditOrder,
  disabledReason,
  children,
}: {
  initialIds: string[];
  isAdmin: boolean;
  canEditOrder: boolean;
  disabledReason?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [order, setOrder] = useState(initialIds);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const childById = useMemo(() => {
    const map = new Map<string, ReactNode>();
    Children.toArray(children).forEach((child) => {
      if (!isValidElement<{ "data-quiz-id"?: string }>(child)) return;
      const id = child.props["data-quiz-id"];
      if (id) map.set(id, child);
    });
    return map;
  }, [children]);

  const hasChanges = order.join("|") !== initialIds.join("|");

  function toggleEditMode() {
    if (!canEditOrder) return;
    setEditMode((value) => !value);
    setSaved(false);
    setError(null);
    setDraggedId(null);
    setDropTarget(null);
    setOrder(initialIds);
  }

  async function saveOrder() {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/admin/quizzes/order", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: order }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to save quiz order");
        return;
      }

      setSaved(true);
      setEditMode(false);
      router.refresh();
      window.setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Network error while saving quiz order");
    } finally {
      setSaving(false);
    }
  }

  const renderedIds = order.filter((id) => childById.has(id));
  const missingIds = initialIds.filter((id) => !renderedIds.includes(id));
  const finalIds = [...renderedIds, ...missingIds];

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex flex-col gap-2 rounded-2xl border border-[#E8E2D9] bg-white/80 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8C6D50]">Admin order editor</p>
            <p className="mt-0.5 text-[12px] font-semibold text-[#918B80]">
              {editMode ? "Drag cards to set the default browse order." : "Default order applies until a user chooses another sort."}
            </p>
            {error && <p className="mt-1 text-[12px] font-bold text-red-600">{error}</p>}
            {saved && (
              <p className="mt-1 inline-flex items-center gap-1 text-[12px] font-bold text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Saved
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {editMode && (
              <button
                type="button"
                onClick={() => {
                  setOrder(initialIds);
                  setError(null);
                }}
                disabled={saving || !hasChanges}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-black text-slate-600 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            )}
            {editMode && (
              <button
                type="button"
                onClick={saveOrder}
                disabled={saving || !hasChanges}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 text-[12px] font-black text-emerald-700 shadow-sm transition-all hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save order
              </button>
            )}
            <button
              type="button"
              onClick={toggleEditMode}
              disabled={!canEditOrder || saving}
              title={!canEditOrder ? disabledReason : undefined}
              className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-3 text-[12px] font-black shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                editMode
                  ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                  : "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100"
              }`}
            >
              {editMode ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              {editMode ? "Done editing" : "Edit order"}
            </button>
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 ${editMode ? "select-none" : ""}`}>
        {finalIds.map((id) => {
          const child = childById.get(id);
          if (!child) return null;
          const isDragging = draggedId === id;
          const showBeforeLine = editMode && dropTarget?.id === id && dropTarget.side === "before" && draggedId !== id;
          const showAfterLine = editMode && dropTarget?.id === id && dropTarget.side === "after" && draggedId !== id;

          return (
            <div
              key={id}
              draggable={editMode && !saving}
              onDragStart={(event) => {
                if (!editMode) return;
                setDraggedId(id);
                setDropTarget(null);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", id);
              }}
              onDragOver={(event) => {
                if (!editMode || !draggedId || draggedId === id) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                const side = getDropSide(event);
                setDropTarget((current) => current?.id === id && current.side === side ? current : { id, side });
              }}
              onDragLeave={(event) => {
                if (!editMode) return;
                const next = event.relatedTarget;
                if (next instanceof Node && event.currentTarget.contains(next)) return;
                setDropTarget((current) => current?.id === id ? null : current);
              }}
              onDrop={(event) => {
                if (!editMode) return;
                event.preventDefault();
                const droppedId = event.dataTransfer.getData("text/plain") || draggedId;
                const target = dropTarget ?? (draggedId && draggedId !== id ? { id, side: getDropSide(event) } : null);
                if (droppedId && target && droppedId !== target.id) {
                  setOrder((current) => reorder(current, droppedId, target));
                }
                setDraggedId(null);
                setDropTarget(null);
              }}
              onDragEnd={() => {
                setDraggedId(null);
                setDropTarget(null);
              }}
              onClickCapture={(event) => {
                if (!editMode) return;
                event.preventDefault();
                event.stopPropagation();
              }}
              className={`relative h-full min-w-0 transition-all duration-150 ${
                editMode ? "cursor-grab rounded-3xl active:cursor-grabbing" : ""
              } ${isDragging ? "scale-[0.985] opacity-45" : ""}`}
            >
              {showBeforeLine && <InsertionLine side="before" />}
              {showAfterLine && <InsertionLine side="after" />}
              {editMode && (
                <div className="absolute left-3 top-3 z-20 inline-flex h-9 items-center gap-1.5 rounded-full border border-violet-200 bg-white/95 px-3 text-[11px] font-black text-violet-700 shadow-md">
                  <GripVertical className="h-4 w-4" />
                  Drag
                </div>
              )}
              {child}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InsertionLine({ side }: { side: "before" | "after" }) {
  const sideClass = side === "before" ? "-left-3" : "-right-3";

  return (
    <div className={`pointer-events-none absolute ${sideClass} top-1/2 z-30 h-[calc(100%+1.25rem)] -translate-y-1/2`}>
      <div className="relative h-full w-1 rounded-full bg-violet-600 shadow-[0_0_0_3px_rgba(139,92,246,0.18),0_10px_24px_rgba(109,40,217,0.35)]">
        <span className="absolute left-1/2 top-0 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-violet-600 shadow-md" />
        <span className="absolute bottom-0 left-1/2 h-3.5 w-3.5 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white bg-violet-600 shadow-md" />
      </div>
    </div>
  );
}
