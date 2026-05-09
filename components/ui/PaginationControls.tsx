"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationControlsProps {
  currentPage: number;
  endItem: number;
  onNext: () => void;
  onPrevious: () => void;
  startItem: number;
  totalItems: number;
  totalPages: number;
}

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

export default function PaginationControls({
  currentPage,
  endItem,
  onNext,
  onPrevious,
  startItem,
  totalItems,
  totalPages,
}: PaginationControlsProps) {
  return (
    <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#E8E2D8] bg-white/62 px-4 py-3 shadow-[0_10px_26px_rgba(44,42,40,0.07)] sm:flex-row sm:items-center sm:justify-between">
      <p className="text-center text-[11px] font-black uppercase tracking-[0.12em] text-[#A09890] sm:text-left">
        {totalItems === 0 ? "0 shown" : `${startItem}-${endItem} of ${totalItems} shown`}
      </p>
      <div className="flex items-center justify-center gap-1">
        <PageButton direction="previous" disabled={currentPage <= 1} onClick={onPrevious} />
        <div className="flex h-12 min-w-[124px] items-center justify-center rounded-[20px] border border-[#E0D9CF] bg-[#F7F1E8]/90 px-4 text-[13px] font-black text-[#3D3A37] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          Page {currentPage} of {totalPages}
        </div>
        <PageButton direction="next" disabled={currentPage >= totalPages} onClick={onNext} />
      </div>
    </div>
  );
}
