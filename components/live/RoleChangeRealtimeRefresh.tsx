"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { getSupabaseRealtimeClient } from "@/lib/supabase-realtime-client";
import { dispatchLiveUserUpdated } from "@/lib/live-user-event";
import { KeyRound, Loader2, ShieldAlert } from "lucide-react";

interface Props {
  userId: string;
}

export default function RoleChangeRealtimeRefresh({ userId }: Props) {
  const router = useRouter();
  const { update } = useSession();
  const refreshTimer = useRef<number | null>(null);
  const signOutTimer = useRef<number | null>(null);
  const [passwordChanged, setPasswordChanged] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseRealtimeClient();
    if (!supabase || !userId) return;

    const refreshVisibleUser = async () => {
      const statusRes = await fetch("/api/user/session-status", {
        credentials: "include",
        cache: "no-store",
      });
      if (statusRes.ok) {
        const status = await statusRes.json().catch(() => ({}));
        if (status.requiresReauth === true) {
          setPasswordChanged(true);
          if (signOutTimer.current === null) {
            signOutTimer.current = window.setTimeout(() => {
              void signOut({ callbackUrl: "/login" });
            }, 4500);
          }
          return;
        }
      }

      const res = await fetch("/api/user/me", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return;

      const user = await res.json();
      dispatchLiveUserUpdated({
        name: typeof user.fullName === "string" ? user.fullName : "",
        email: typeof user.email === "string" ? user.email : "",
        username: typeof user.username === "string" ? user.username : undefined,
        role: typeof user.role === "string" ? user.role : "STUDENT",
      });
    };

    const scheduleSessionRefresh = () => {
      if (refreshTimer.current !== null) {
        window.clearTimeout(refreshTimer.current);
      }

      refreshTimer.current = window.setTimeout(() => {
        refreshTimer.current = null;
        void refreshVisibleUser()
          .finally(() => update({ refreshUser: true }))
          .finally(() => {
            router.refresh();
          });
      }, 350);
    };

    const channel = supabase
      .channel(`mcqify-role-change-events-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "RoleChangeEvent",
        },
        scheduleSessionRefresh
      )
      .subscribe();

    return () => {
      if (refreshTimer.current !== null) {
        window.clearTimeout(refreshTimer.current);
      }
      if (signOutTimer.current !== null) {
        window.clearTimeout(signOutTimer.current);
      }
      void supabase.removeChannel(channel);
    };
  }, [router, update, userId]);

  function signOutNow() {
    if (signOutTimer.current !== null) {
      window.clearTimeout(signOutTimer.current);
      signOutTimer.current = null;
    }
    void signOut({ callbackUrl: "/login" });
  }

  if (!passwordChanged) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-white/80 bg-white p-6 text-center shadow-[0_28px_90px_rgba(15,23,42,0.28)]">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-amber-50 to-transparent" />
        <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-700 ring-1 ring-amber-200">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="relative space-y-2">
          <h2 className="text-xl font-black tracking-tight text-slate-950">Password changed</h2>
          <p className="mx-auto max-w-sm text-sm font-medium leading-relaxed text-slate-600">
            An administrator updated your password. For your account security, this session will close now. Please sign in again with your new password.
          </p>
        </div>
        <button
          type="button"
          onClick={signOutNow}
          className="relative mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-[0_12px_28px_rgba(15,23,42,0.22)] transition-colors hover:bg-slate-800"
        >
          <KeyRound className="h-4 w-4" />
          Sign in again
        </button>
        <div className="relative mt-4 flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Signing you out automatically...
        </div>
      </div>
    </div>
  );
}
