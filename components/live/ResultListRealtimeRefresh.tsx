"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseRealtimeClient } from "@/lib/supabase-realtime-client";

export default function ResultListRealtimeRefresh() {
  const router = useRouter();
  const refreshTimer = useRef<number | null>(null);

  useEffect(() => {
    const supabase = getSupabaseRealtimeClient();
    if (!supabase) return;

    const scheduleRefresh = () => {
      if (document.visibilityState !== "visible") return;

      if (refreshTimer.current !== null) {
        window.clearTimeout(refreshTimer.current);
      }

      refreshTimer.current = window.setTimeout(() => {
        router.refresh();
        refreshTimer.current = null;
      }, 350);
    };

    const channel = supabase
      .channel("quizzo-result-list-events")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ResultListEvent",
        },
        scheduleRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimer.current !== null) {
        window.clearTimeout(refreshTimer.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
