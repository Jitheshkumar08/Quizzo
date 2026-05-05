"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function SessionRoleRefresher({
  intervalMs = 10000,
}: {
  intervalMs?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, update } = useSession();
  const lastRole = useRef(session?.user?.role);

  useEffect(() => {
    lastRole.current = session?.user?.role;
  }, [session?.user?.role]);

  useEffect(() => {
    const refreshRole = async () => {
      if (document.visibilityState !== "visible") return;

      const nextSession = await update({ refreshUser: true });
      const nextRole = nextSession?.user?.role;

      if (nextRole && lastRole.current && nextRole !== lastRole.current) {
        lastRole.current = nextRole;
        router.refresh();

        if (
          pathname.startsWith("/admin") && nextRole !== "ADMIN"
        ) {
          router.replace("/dashboard");
        }

        if (
          pathname.startsWith("/instructor") &&
          nextRole !== "INSTRUCTOR" &&
          nextRole !== "ADMIN"
        ) {
          router.replace("/dashboard");
        }
      }
    };

    const id = window.setInterval(() => {
      void refreshRole();
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs, pathname, router, update]);

  return null;
}
