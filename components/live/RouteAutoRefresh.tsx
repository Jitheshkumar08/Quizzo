"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function RouteAutoRefresh({
  intervalMs = 10000,
}: {
  intervalMs?: number;
}) {
  const router = useRouter();
  const refreshing = useRef(false);

  useEffect(() => {
    const refresh = () => {
      if (refreshing.current || document.visibilityState !== "visible") return;
      refreshing.current = true;
      router.refresh();
      window.setTimeout(() => {
        refreshing.current = false;
      }, 1000);
    };

    const id = window.setInterval(refresh, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, router]);

  return null;
}
