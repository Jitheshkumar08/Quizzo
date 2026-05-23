"use client";

import { Sun, Moon } from "lucide-react";
import { useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  function toggleTheme() {
    setIsDark((current) => {
      const next = !current;
      document.documentElement.classList.toggle("dark", next);
      return next;
    });
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative w-10 h-10 rounded-full flex items-center justify-center cursor-pointer border border-[var(--q-border-primary)] bg-[var(--q-surface-hover)] shadow-sm transition-all duration-300 hover:scale-110 hover:shadow-md active:scale-95"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      <Sun
        className={`absolute h-[18px] w-[18px] text-amber-500 transition-all duration-500 ${
          isDark
            ? "rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100"
        }`}
        strokeWidth={2.4}
      />
      <Moon
        className={`absolute h-[18px] w-[18px] text-blue-300 transition-all duration-500 ${
          isDark
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        }`}
        strokeWidth={2.4}
      />
    </button>
  );
}
