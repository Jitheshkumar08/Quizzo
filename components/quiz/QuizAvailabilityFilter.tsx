"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ElementType } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarClock, Check, ChevronDown, Clock3, Filter, Infinity as InfinityIcon, Lock, RotateCcw, Tags } from "lucide-react";

export type QuizAvailabilityFilterValue = "all" | "open" | "upcoming";
export type QuizTagFilterValue = "single-attempt" | "multi-attempt" | "password" | "time-limit";

const statusOptions: Array<{
  value: QuizAvailabilityFilterValue;
  label: string;
  dot: string;
}> = [
    { value: "all", label: "All quizzes", dot: "bg-violet-500" },
    { value: "open", label: "Open", dot: "bg-emerald-500" },
    { value: "upcoming", label: "Upcoming", dot: "bg-blue-500" },
  ];

const tagOptions: Array<{
  value: QuizTagFilterValue;
  label: string;
  dot: string;
  icon: ElementType;
}> = [
    { value: "single-attempt", label: "1 attempt", dot: "bg-slate-500", icon: RotateCcw },
    { value: "multi-attempt", label: "Multi attempt", dot: "bg-cyan-500", icon: InfinityIcon },
    { value: "password", label: "Password", dot: "bg-amber-500", icon: Lock },
    { value: "time-limit", label: "Time limit", dot: "bg-purple-500", icon: Clock3 },
  ];

function encodeTags(tags: readonly QuizTagFilterValue[]) {
  return tags.join(",");
}

function RaisedFilterButton({
  active,
  accent,
  icon: Icon,
  label,
  open,
  onClick,
}: {
  active: boolean;
  accent: "violet" | "orange";
  icon: ElementType;
  label: string;
  open: boolean;
  onClick: () => void;
}) {
  const palette = active
    ? accent === "violet"
      ? {
        shell: "bg-[#6D28D9]",
        face: "border-[#6D28D9] bg-[#A78BFA] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]",
        dot: "bg-white/75",
      }
      : {
        shell: "bg-[#C2410C]",
        face: "border-[#C2410C] bg-[#FB923C] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22)]",
        dot: "bg-white/75",
      }
    : {
      shell: "bg-[#2C2A28]",
      face: "border-[#D8CFC1] bg-[#FFF7E6] text-[#2C2A28] shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]",
      dot: accent === "violet" ? "bg-violet-400" : "bg-orange-400",
    };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group cursor-pointer rounded-[0.75em] border-none ${palette.shell}`}
      aria-expanded={open}
      aria-haspopup="menu"
    >
      <span
        className={`flex h-9 items-center justify-center gap-1.5 rounded-[0.75em] border-2 px-3 text-[11px] font-black leading-none transition-transform duration-100 ease-out -translate-y-[0.18em] group-hover:-translate-y-[0.3em] group-active:translate-y-0 ${palette.face}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${palette.dot}`} />
        <Icon className="h-3.5 w-3.5" />
        <span className="whitespace-nowrap">{label}</span>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </span>
    </button>
  );
}

export default function QuizAvailabilityFilter({
  initialValue = "all",
  initialTags = [],
}: {
  initialValue?: QuizAvailabilityFilterValue;
  initialTags?: QuizTagFilterValue[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openMenu, setOpenMenu] = useState<"availability" | "tags" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedTags = useMemo(() => new Set(initialTags), [initialTags]);
  const selectedStatus = statusOptions.find((option) => option.value === initialValue) ?? statusOptions[0];
  const availabilityLabel = initialValue === "all" ? "Availability" : selectedStatus.label;
  const tagsLabel = selectedTags.size === 0 ? "Tags" : `${selectedTags.size} tag${selectedTags.size === 1 ? "" : "s"}`;

  function replaceParams(nextStatus: QuizAvailabilityFilterValue, nextTags: readonly QuizTagFilterValue[]) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextStatus === "all") {
      params.delete("status");
    } else {
      params.set("status", nextStatus);
    }

    if (nextTags.length === 0) {
      params.delete("tags");
    } else {
      params.set("tags", encodeTags(nextTags));
    }

    params.delete("availability");

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function updateStatus(value: QuizAvailabilityFilterValue) {
    replaceParams(value, initialTags);
    setOpenMenu(null);
  }

  function toggleTag(value: QuizTagFilterValue) {
    let nextTags: QuizTagFilterValue[];

    if (selectedTags.has(value)) {
      nextTags = initialTags.filter((tag) => tag !== value);
    } else if (value === "single-attempt") {
      nextTags = [...initialTags.filter((tag) => tag !== "multi-attempt"), value];
    } else if (value === "multi-attempt") {
      nextTags = [...initialTags.filter((tag) => tag !== "single-attempt"), value];
    } else {
      nextTags = [...initialTags, value];
    }

    replaceParams(initialValue, nextTags);
  }

  function clearTags() {
    replaceParams(initialValue, []);
  }

  return (
    <div ref={ref} className="flex w-full flex-row flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-start">
      <div className="relative">
        <RaisedFilterButton
          active={initialValue !== "all"}
          accent="violet"
          icon={Filter}
          label={availabilityLabel}
          open={openMenu === "availability"}
          onClick={() => setOpenMenu((value) => value === "availability" ? null : "availability")}
        />

        {openMenu === "availability" && (
          <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[14.5rem] overflow-hidden rounded-[20px] border border-[#E8E2D9] bg-white shadow-[0_14px_34px_rgba(44,42,40,0.14)] sm:w-[15.5rem]">
            <div className="bg-[#F8F3EB] px-3.5 pb-2 pt-3">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#B0A89E]">Availability</p>
            </div>
            <div className="py-1">
              {statusOptions.map((option) => {
                const isActive = option.value === initialValue;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateStatus(option.value)}
                    className={`flex w-full cursor-pointer items-center justify-between px-3.5 py-2 text-[12px] font-black transition-colors ${isActive ? "bg-[#F5EDE2] text-[#2C2A28]" : "text-[#4A4744] hover:bg-[#FAF7F3]"
                      }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={`h-2 w-2 rounded-full ${option.dot}`} />
                      {option.label}
                    </span>
                    {isActive && <Check className="h-3.5 w-3.5 text-violet-600" />}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-[#E8E2D9] bg-[#F8F3EB] px-3.5 py-2.5">
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#918B80]">
                <CalendarClock className="h-3 w-3" />
                Sorted by schedule time
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <RaisedFilterButton
          active={selectedTags.size > 0}
          accent="orange"
          icon={Tags}
          label={tagsLabel}
          open={openMenu === "tags"}
          onClick={() => setOpenMenu((value) => value === "tags" ? null : "tags")}
        />

        {openMenu === "tags" && (
          <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[14.5rem] overflow-hidden rounded-[20px] border border-[#E8E2D9] bg-white shadow-[0_14px_34px_rgba(44,42,40,0.14)] sm:w-[15.5rem]">
            <div className="bg-[#F8F3EB] px-3.5 pb-2 pt-3">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#B0A89E]">Quiz Tags</p>
            </div>
            <div className="py-1">
              <button
                type="button"
                onClick={clearTags}
                className={`flex w-full cursor-pointer items-center justify-between px-3.5 py-2 text-[12px] font-black transition-colors ${selectedTags.size === 0 ? "bg-[#F5EDE2] text-[#2C2A28]" : "text-[#4A4744] hover:bg-[#FAF7F3]"
                  }`}
              >
                <span className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-violet-500" />
                  All tags
                </span>
                {selectedTags.size === 0 && <Check className="h-3.5 w-3.5 text-violet-600" />}
              </button>

              {tagOptions.map((option) => {
                const Icon = option.icon;
                const isActive = selectedTags.has(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleTag(option.value)}
                    className={`flex w-full cursor-pointer items-center justify-between px-3.5 py-2 text-[12px] font-black transition-colors ${isActive ? "bg-[#F5EDE2] text-[#2C2A28]" : "text-[#4A4744] hover:bg-[#FAF7F3]"
                      }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className={`h-2 w-2 rounded-full ${option.dot}`} />
                      <Icon className="h-3.5 w-3.5 text-[#918B80]" />
                      {option.label}
                    </span>
                    {isActive && <Check className="h-3.5 w-3.5 text-violet-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
