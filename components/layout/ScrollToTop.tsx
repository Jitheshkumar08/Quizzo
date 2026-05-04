"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { usePathname } from "next/navigation";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();
  const isAllowedOnMobile = pathname?.includes("/edit") || pathname?.includes("/upload");

  useEffect(() => {
    const container = document.getElementById("dashboard-scroll-area");
    if (!container) return;

    const handleScroll = () => {
      // Show button if user scrolled down more than 200px
      if (container.scrollTop > 200) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    const container = document.getElementById("dashboard-scroll-area");
    if (container) {
      container.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <button
      onClick={scrollToTop}
      aria-label="Scroll to top"
      className={`fixed bottom-10 right-10 z-50 p-3.5 rounded-full bg-[#2C2A28]/90 text-[#FDFBFA] backdrop-blur-2xl border border-white/20 shadow-[0_12px_24px_rgba(44,42,40,0.25),inset_0_1px_1px_rgba(255,255,255,0.2)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-[#1A1816] hover:-translate-y-1 hover:shadow-[0_16px_32px_rgba(44,42,40,0.35)] active:translate-y-0 active:scale-95 flex items-center justify-center ${
        isVisible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-12 pointer-events-none"
      } ${!isAllowedOnMobile ? "hidden sm:flex" : ""}`}
    >
      <ArrowUp className="w-6 h-6" strokeWidth={2.5} />
    </button>
  );
}