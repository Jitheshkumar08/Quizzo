"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const MAX_TIMEOUT_MS = 2_147_483_647;

export default function ScheduleBoundaryRefresh({
  boundaries,
  serverNow,
}: {
  boundaries: string[];
  serverNow: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const serverSkewMs = new Date(serverNow).getTime() - Date.now();

    const nextBoundary = boundaries
      .map((value) => new Date(value).getTime())
      .filter((time) => Number.isFinite(time))
      .filter((time) => time > Date.now() + serverSkewMs)
      .sort((a, b) => a - b)[0];

    if (!nextBoundary) return;

    const delay = Math.min(
      Math.max(0, nextBoundary - (Date.now() + serverSkewMs) + 900),
      MAX_TIMEOUT_MS
    );

    const timer = window.setTimeout(() => {
      router.refresh();
    }, delay);

    return () => window.clearTimeout(timer);
  }, [boundaries, router, serverNow]);

  return null;
}
