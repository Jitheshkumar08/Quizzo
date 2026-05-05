"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export default function AdminQuizUsernameSearch({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const nextValue = value.trim();

      if (nextValue) {
        params.set("username", nextValue);
      } else {
        params.delete("username");
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [pathname, router, searchParams, value]);

  return (
    <label className="relative block w-full sm:max-w-sm">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A09890]" />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search creator username..."
        aria-label="Search quizzes by creator username"
        className="h-12 w-full rounded-2xl border border-[#E4DDD3] bg-white/78 pl-11 pr-4 text-sm font-semibold text-[#2C2A28] shadow-[0_8px_26px_rgba(44,42,40,0.06)] outline-none transition-all placeholder:text-[#AFA69A] focus:border-violet-200 focus:bg-white focus:ring-4 focus:ring-violet-100/70"
      />
    </label>
  );
}
