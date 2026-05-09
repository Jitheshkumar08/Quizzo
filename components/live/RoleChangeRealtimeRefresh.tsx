"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { getSupabaseRealtimeClient } from "@/lib/supabase-realtime-client";
import { dispatchLiveUserUpdated } from "@/lib/live-user-event";
import { Ban, KeyRound, Loader2, ShieldAlert } from "lucide-react";

interface Props {
  userId: string;
}

const ACCOUNT_DELETED_REDIRECT_SECONDS = 60;
const RESUME_SYNC_COOLDOWN_MS = 2000;

type VisibleUserResponse = {
  username?: string | null;
  email?: string | null;
  fullName?: string | null;
  role?: string | null;
  profileImageUrl?: string | null;
  requiresReauth?: boolean;
};

export default function RoleChangeRealtimeRefresh({ userId }: Props) {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const signOutTimer = useRef<number | null>(null);
  const countdownTimer = useRef<number | null>(null);
  const syncInFlight = useRef<Promise<void> | null>(null);
  const lastSyncAt = useRef(0);
  const sessionUser = useRef(session?.user);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [accountDeleted, setAccountDeleted] = useState(false);
  const [deletedRedirectSeconds, setDeletedRedirectSeconds] = useState(ACCOUNT_DELETED_REDIRECT_SECONDS);

  const scheduleDeletedRedirect = useCallback(() => {
    setPasswordChanged(false);
    setDeletedRedirectSeconds(ACCOUNT_DELETED_REDIRECT_SECONDS);
    setAccountDeleted(true);
  }, []);

  const handlePasswordChanged = useCallback(() => {
    setPasswordChanged(true);
    if (signOutTimer.current === null) {
      signOutTimer.current = window.setTimeout(() => {
        void signOut({ callbackUrl: "/login" });
      }, 4500);
    }
  }, []);

  const refreshVisibleUser = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!userId || status === "loading") return;

      const now = Date.now();
      if (!force && now - lastSyncAt.current < RESUME_SYNC_COOLDOWN_MS) return;
      if (syncInFlight.current) return syncInFlight.current;

      lastSyncAt.current = now;

      syncInFlight.current = (async () => {
        const res = await fetch("/api/user/me", {
          credentials: "include",
          cache: "no-store",
        });

        if (res.status === 404) {
          scheduleDeletedRedirect();
          return;
        }
        if (!res.ok) return;

        const user = (await res.json().catch(() => null)) as VisibleUserResponse | null;
        if (!user) return;

        if (user.requiresReauth === true) {
          handlePasswordChanged();
          return;
        }

        const liveUser = {
          name: typeof user.fullName === "string" ? user.fullName : "",
          email: typeof user.email === "string" ? user.email : "",
          username: typeof user.username === "string" ? user.username : undefined,
          role: typeof user.role === "string" ? user.role : "STUDENT",
          profileImageUrl: typeof user.profileImageUrl === "string" ? user.profileImageUrl : null,
        };

        const currentUser = sessionUser.current;
        const sessionChanged =
          currentUser?.name !== liveUser.name ||
          currentUser?.email !== liveUser.email ||
          currentUser?.username !== liveUser.username ||
          currentUser?.role !== liveUser.role ||
          (currentUser?.profileImageUrl ?? currentUser?.image ?? null) !== liveUser.profileImageUrl;

        if (!sessionChanged) return;

        dispatchLiveUserUpdated(liveUser);
        await update({ refreshUser: true });
        router.refresh();
      })().finally(() => {
        syncInFlight.current = null;
      });

      return syncInFlight.current;
    },
    [handlePasswordChanged, router, scheduleDeletedRedirect, status, update, userId]
  );

  useEffect(() => {
    sessionUser.current = session?.user;
  }, [session?.user]);

  useEffect(() => {
    return () => {
      if (signOutTimer.current !== null) {
        window.clearTimeout(signOutTimer.current);
      }
      if (countdownTimer.current !== null) {
        window.clearInterval(countdownTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!accountDeleted) return;

    if (countdownTimer.current !== null) {
      window.clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }

    if (signOutTimer.current !== null) {
      window.clearTimeout(signOutTimer.current);
      signOutTimer.current = null;
    }

    countdownTimer.current = window.setInterval(() => {
      setDeletedRedirectSeconds((seconds) => {
        const nextSeconds = Math.max(0, seconds - 1);
        if (nextSeconds === 0 && countdownTimer.current !== null) {
          window.clearInterval(countdownTimer.current);
          countdownTimer.current = null;
        }
        return nextSeconds;
      });
    }, 1000);

    signOutTimer.current = window.setTimeout(() => {
      void signOut({ callbackUrl: "/signup" });
    }, ACCOUNT_DELETED_REDIRECT_SECONDS * 1000);

    return () => {
      if (countdownTimer.current !== null) {
        window.clearInterval(countdownTimer.current);
        countdownTimer.current = null;
      }
      if (signOutTimer.current !== null) {
        window.clearTimeout(signOutTimer.current);
        signOutTimer.current = null;
      }
    };
  }, [accountDeleted]);

  useEffect(() => {
    if (!userId || status === "loading") return;

    void refreshVisibleUser({ force: true });

    const syncOnResume = () => {
      if (document.visibilityState === "visible") {
        void refreshVisibleUser();
      }
    };

    const syncOnReconnect = () => {
      void refreshVisibleUser();
    };

    window.addEventListener("online", syncOnReconnect);
    document.addEventListener("visibilitychange", syncOnResume);

    return () => {
      window.removeEventListener("online", syncOnReconnect);
      document.removeEventListener("visibilitychange", syncOnResume);
    };
  }, [refreshVisibleUser, status, userId]);

  useEffect(() => {
    const supabase = getSupabaseRealtimeClient();
    if (!supabase || !userId || status === "loading") return;

    const channel = supabase
      .channel(`quizzo-role-change-events-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "RoleChangeEvent",
          filter: `targetUserId=eq.${userId}`,
        },
        () => {
          void refreshVisibleUser({ force: true });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshVisibleUser, status, userId]);

  function signOutNow() {
    if (signOutTimer.current !== null) {
      window.clearTimeout(signOutTimer.current);
      signOutTimer.current = null;
    }
    void signOut({ callbackUrl: "/login" });
  }

  function signUpAgain() {
    if (signOutTimer.current !== null) {
      window.clearTimeout(signOutTimer.current);
      signOutTimer.current = null;
    }
    if (countdownTimer.current !== null) {
      window.clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
    void signOut({ callbackUrl: "/signup" });
  }

  if (accountDeleted) {
    return (
      <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-[#1F1B19]/78 p-4 backdrop-blur-lg">
        <div className="relative w-full max-w-[430px] overflow-hidden rounded-[34px] border border-white/95 bg-[#FFFDF9] p-7 text-center shadow-[0_34px_110px_rgba(0,0,0,0.46),0_0_0_1px_rgba(31,27,25,0.08)]">
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-rose-100/80 to-transparent" />
          <div className="absolute -right-14 -top-16 h-36 w-36 rounded-full bg-rose-100 blur-3xl" />
          <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] bg-rose-100 text-rose-700 shadow-[0_12px_28px_rgba(190,18,60,0.16)] ring-1 ring-rose-200">
            <Ban className="h-8 w-8" />
          </div>
          <div className="relative space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-[#1F1B19]">Account removed</h2>
            <p className="mx-auto max-w-sm text-sm font-semibold leading-relaxed text-[#6B6357]">
              Your Quizzo account was removed by an administrator. This session is no longer active.
            </p>
            <p className="mx-auto max-w-sm text-xs font-bold leading-relaxed text-[#918B80]">
              If you think this was a mistake, contact your administrator. Otherwise, create a new account to continue.
            </p>
          </div>
          <button
            type="button"
            onClick={signUpAgain}
            className="relative mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-[#1F1B19] px-5 py-3.5 text-sm font-black text-white shadow-[0_14px_30px_rgba(31,27,25,0.24)] transition-colors hover:bg-[#14110F]"
          >
            <Ban className="h-4 w-4" />
            Continue to sign up
          </button>
          <div className="relative mt-4 flex items-center justify-center gap-2 text-xs font-bold text-[#A49A8D]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Redirecting automatically in {Math.floor(deletedRedirectSeconds / 60)}:
            {String(deletedRedirectSeconds % 60).padStart(2, "0")}
          </div>
        </div>
      </div>
    );
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
