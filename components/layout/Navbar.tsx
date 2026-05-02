"use client";

import Link from "next/link";
import { Moon, Sun } from "lucide-react";
// Currently no logic implementation, just the button for theme toggle as requested
export default function Navbar() {
    return (
        <nav className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-5xl z-50 rounded-full bg-white/40 backdrop-blur-[32px] border border-white/80 shadow-[0_16px_32px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(255,255,255,0.8)] transition-all duration-300">
            <div className="px-6 relative overflow-hidden rounded-full">
                {/* Glossy highlight inside navbar */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/70 to-transparent pointer-events-none"></div>

                <div className="flex items-center justify-between h-16 relative z-10">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                        <Link href="/" className="flex items-center gap-2 group">
                            <div className="w-9 h-9 rounded-full bg-[#2C2A28] text-[#FDFBFA] flex items-center justify-center font-bold text-xl transition-transform group-hover:scale-105 duration-300 shadow-md">
                                M
                            </div>
                            <span className="font-bold text-[22px] tracking-tight text-[#2C2A28]">
                                MCQify
                            </span>
                        </Link>
                    </div>

                    {/* Theme Toggle & Links */}
                    <div className="flex items-center gap-4">
                        <button
                            aria-label="Toggle theme"
                            className="p-2.5 rounded-full text-[#918B80] bg-white/40 border border-white/80 hover:bg-white/80 hover:text-[#8C5D3E] hover:rotate-[30deg] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[inset_0_2px_6px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.04)] backdrop-blur-xl"
                        >
                            <Sun className="h-[18px] w-[18px]" />
                        </button>
                        <Link href="/login" className="text-[15px] font-bold text-[#2C2A28] border border-[#2C2A28]/20 bg-transparent px-6 py-2.5 rounded-full hover:border-[#2C2A28]/40 hover:bg-[#2C2A28]/5 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 tracking-wide">
                            Log in
                        </Link>
                        <Link href="/signup" className="text-[15px] font-bold bg-[#2C2A28] text-[#FDFBFA] px-6 py-2.5 rounded-full hover:bg-[#1A1816] shadow-[0_8px_20px_rgba(44,42,40,0.2)] hover:shadow-[0_12px_24px_rgba(44,42,40,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_4px_10px_rgba(44,42,40,0.2)] transition-all duration-300 tracking-wide">
                            Sign up
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}