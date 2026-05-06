"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3 } from "lucide-react";

type DateLike = Date | string;

function toTime(value: DateLike) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

function formatStartsIn(seconds: number) {
  if (seconds <= 0) return "Opening...";

  if (seconds < 3600) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `Starts in ${m}:${s}`;
  }

  if (seconds < 86_400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `Starts in ${h}h ${m}m`;
  }

  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3600);
  return `Starts in ${d}d ${h}h`;
}

export default function ScheduleStartBadge({
  scheduledStart,
  serverNow,
}: {
  scheduledStart: DateLike;
  serverNow: DateLike;
}) {
  const router = useRouter();
  const [remainingSec, setRemainingSec] = useState(0);
  const refreshFired = useRef(false);
  const serverSkewMs = useRef(0);

  useEffect(() => {
    serverSkewMs.current = toTime(serverNow) - Date.now();
  }, [serverNow]);

  useEffect(() => {
    const startTime = toTime(scheduledStart);
    const tick = () => {
      const now = Date.now() + serverSkewMs.current;
      setRemainingSec(Math.max(0, Math.ceil((startTime - now) / 1000)));
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [scheduledStart]);

  useEffect(() => {
    if (remainingSec !== 0 || refreshFired.current) return;

    refreshFired.current = true;
    const timer = window.setTimeout(() => {
      router.refresh();
    }, 900);

    return () => window.clearTimeout(timer);
  }, [remainingSec, router]);

  return (
    <div className="inline-flex min-w-max items-center justify-center gap-1.5 rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-purple-600 shadow-sm">
      <Clock3 className="h-3.5 w-3.5" />
      <span className="whitespace-nowrap normal-case tracking-normal">{formatStartsIn(remainingSec)}</span>
    </div>
  );
}
