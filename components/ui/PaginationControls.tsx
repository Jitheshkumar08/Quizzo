"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Check } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  endItem: number;
  onNext: () => void;
  onPrevious: () => void;
  startItem: number;
  totalItems: number;
  totalPages: number;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [
  { value: 20, label: "20" },
  { value: 50, label: "50" },
  { value: 100, label: "100" },
  { value: Infinity, label: "All" },
];

function PageButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "previous" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
      disabled={disabled}
      className="group relative m-1 box-border min-h-14 min-w-14 cursor-pointer rounded-[20px] border-0 bg-transparent px-2 font-[inherit] disabled:cursor-not-allowed disabled:opacity-45"
      aria-label={direction === "previous" ? "Previous page" : "Next page"}
    >
      <span className="relative z-20 flex min-h-12 items-center justify-center rounded-[20px] bg-[linear-gradient(145deg,#6a11cb,#2575fc)] px-4 text-white shadow-[0_-1px_rgba(0,0,0,0.25)] transition-[transform,border-radius] duration-300 group-active:translate-y-0.5 group-active:rounded-[10px_10px_8px_8px/8px]">
        <Icon className="h-5 w-5 stroke-[2.6]" />
      </span>
      <span className="absolute bottom-1 left-1 z-10 h-[calc(100%-10px)] w-[calc(100%-8px)] rounded-[20px] bg-[linear-gradient(145deg,#2575fc,#6a11cb)] pt-1.5 shadow-[0_2px_3px_0_rgba(0,0,0,0.5)] transition-[border-radius,padding-top] duration-200 group-active:rounded-[10px_10px_8px_8px/8px] group-active:pt-0" />
      <span className="absolute left-0 top-1 z-0 h-[calc(100%-4px)] w-full rounded-[20px] bg-black/15 shadow-[0_1px_1px_0_rgba(255,255,255,0.75),inset_0_2px_2px_rgba(0,0,0,0.25)] transition-[border-radius] duration-200 group-active:rounded-[10px_10px_8px_8px/8px]" />
    </button>
  );
}

function PageSizeDropdown({
  pageSize,
  onChange,
}: {
  pageSize: number;
  onChange: (size: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const currentLabel = pageSize === Infinity ? "All" : String(pageSize);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex cursor-pointer items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full font-bold tracking-wide shadow-sm transition-all duration-150 hover:brightness-110 active:scale-95 bg-gradient-to-r from-[#8C6D50] to-[#6B5240] text-white shadow-[#8C6D50]/20"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
        Show {currentLabel}
        <ChevronDown className={`w-3 h-3 ml-0.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 bottom-full mb-2 z-50 w-36 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E8E2D9] py-1.5 overflow-hidden">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#B0A89E] px-3 pt-1.5 pb-2">Rows Per Page</p>
          {PAGE_SIZE_OPTIONS.map((opt) => {
            const isActive = pageSize === opt.value;
            return (
              <button
                type="button"
                key={opt.label}
                onClick={() => {
                  setOpen(false);
                  onChange(opt.value);
                }}
                className={`w-full flex cursor-pointer items-center justify-between px-3 py-2 text-[12px] font-bold transition-colors duration-100 ${isActive
                  ? "bg-[#F5EDE2] text-[#2C2A28]"
                  : "text-[#4A4744] hover:bg-[#F5EDE2]/60 hover:text-[#2C2A28]"
                  }`}
              >
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gradient-to-br from-[#8C6D50] to-[#6B5240]" />
                  {opt.label}
                </span>
                {isActive && <Check className="w-3.5 h-3.5 text-[#8C6D50]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PaginationControls({
  currentPage,
  endItem,
  onNext,
  onPrevious,
  startItem,
  totalItems,
  totalPages,
  pageSize,
  onPageSizeChange,
}: PaginationControlsProps) {
  const controlsRef = useRef<HTMLDivElement>(null);

  function restoreControlPosition(targetTop: number | null) {
    const scrollArea = document.getElementById("dashboard-scroll-area");
    const currentTop = controlsRef.current?.getBoundingClientRect().top;

    if (targetTop === null || currentTop === undefined) {
      return;
    }

    const delta = currentTop - targetTop;
    if (Math.abs(delta) < 1) {
      return;
    }

    if (scrollArea) {
      const previousBehavior = scrollArea.style.scrollBehavior;
      scrollArea.style.scrollBehavior = "auto";
      scrollArea.scrollTop += delta;
      scrollArea.style.scrollBehavior = previousBehavior;
      return;
    }

    window.scrollBy({ top: delta, behavior: "auto" });
  }

  function preserveScrollPosition(update: () => void) {
    const targetTop = controlsRef.current?.getBoundingClientRect().top ?? null;
    update();

    window.requestAnimationFrame(() => {
      restoreControlPosition(targetTop);
      window.requestAnimationFrame(() => restoreControlPosition(targetTop));
    });

    window.setTimeout(() => restoreControlPosition(targetTop), 80);
  }

  return (
    <div ref={controlsRef} className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#E8E2D8] bg-white/62 px-4 py-3 shadow-[0_10px_26px_rgba(44,42,40,0.07)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center justify-center gap-3 sm:justify-start">
        <p className="text-[11px] font-black uppercase tracking-[0.12em] text-[#A09890]">
          {totalItems === 0 ? "0 shown" : `${startItem}-${endItem} of ${totalItems} shown`}
        </p>
        <PageSizeDropdown pageSize={pageSize} onChange={(size) => preserveScrollPosition(() => onPageSizeChange(size))} />
      </div>
      <div className="flex items-center justify-center gap-1">
        <PageButton direction="previous" disabled={currentPage <= 1} onClick={() => preserveScrollPosition(onPrevious)} />
        <div className="flex h-12 min-w-[124px] items-center justify-center rounded-[20px] border border-[#E0D9CF] bg-[#F7F1E8]/90 px-4 text-[13px] font-black text-[#3D3A37] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          Page {currentPage} of {totalPages}
        </div>
        <PageButton direction="next" disabled={currentPage >= totalPages} onClick={() => preserveScrollPosition(onNext)} />
      </div>
    </div>
  );
}
