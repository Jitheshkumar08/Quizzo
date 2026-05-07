"use client";

import { useEffect } from "react";

const HEARTBEAT_INTERVAL_MS = 120_000;
const FIRST_HEARTBEAT_DELAY_MS = 10_000;
const DISABLED_STORAGE_KEY = "quizzo:presence-disabled-until";

function isPresenceDisabledInBrowser() {
  const value = window.localStorage.getItem(DISABLED_STORAGE_KEY);
  if (!value) return false;

  const disabledUntil = Number(value);
  if (Number.isNaN(disabledUntil) || disabledUntil <= Date.now()) {
    window.localStorage.removeItem(DISABLED_STORAGE_KEY);
    return false;
  }

  return true;
}

function disablePresenceInBrowser() {
  window.localStorage.setItem(DISABLED_STORAGE_KEY, String(Date.now() + 5 * 60 * 1000));
}

function sendHeartbeat() {
  if (isPresenceDisabledInBrowser()) return;

  void fetch("/api/user/presence", {
    method: "POST",
    credentials: "include",
    cache: "no-store",
    keepalive: true,
  })
    .then(async (res) => {
      const data = await res.json().catch(() => null);
      if (data?.presenceEnabled === false) {
        disablePresenceInBrowser();
      }
    })
    .catch(() => {
      // Presence is best-effort; the next heartbeat will try again.
    });
}

export default function PresenceHeartbeat() {
  useEffect(() => {
    const firstHeartbeat = window.setTimeout(sendHeartbeat, FIRST_HEARTBEAT_DELAY_MS);

    const interval = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        window.setTimeout(sendHeartbeat, FIRST_HEARTBEAT_DELAY_MS);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearTimeout(firstHeartbeat);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}
