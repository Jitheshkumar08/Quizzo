"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export default function InstructorQuizTitleSearch({ initialValue = "" }: { initialValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const currentQueryString = searchParams.toString();

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams(currentQueryString);
      const nextValue = value.trim();

      if (nextValue) {
        params.set("q", nextValue);
      } else {
        params.delete("q");
      }

      const query = params.toString();
      if (query === currentQueryString) return;

      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [currentQueryString, pathname, router, value]);

  return (
    <label className="relative block w-full sm:w-[min(24rem,38vw)]">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A09890]" />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Search by title..."
        aria-label="Search my quizzes by title"
        className="h-12 w-full rounded-2xl border border-[#E4DDD3] bg-white/78 pl-11 pr-4 text-sm font-semibold text-[#2C2A28] shadow-[0_8px_26px_rgba(44,42,40,0.06)] outline-none transition-all placeholder:text-[#AFA69A] focus:border-violet-200 focus:bg-white focus:ring-4 focus:ring-violet-100/70"
      />
    </label>
  );
}
