"use client";

import Link from "next/link";
import Image from "next/image";
import { Sun } from "lucide-react";
// Currently no logic implementation, just the button for theme toggle as requested
export default function Navbar() {
    return (
        <nav className="fixed top-2 sm:top-4 left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-5xl z-50 rounded-full bg-white/40 backdrop-blur-[32px] border border-white/80 shadow-[0_16px_32px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.04),inset_0_1px_2px_rgba(255,255,255,0.8)] transition-all duration-300">
            <div className="px-3 sm:px-6 relative overflow-hidden rounded-full">
                {/* Glossy highlight inside navbar */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/70 to-transparent pointer-events-none"></div>

                <div className="flex items-center justify-between h-16 sm:h-16 relative z-10 gap-2">
                    {/* Logo */}
                    <div className="flex-shrink-0">
                        <Link href="/" className="flex items-center gap-2 group">
                            <Image
                                src="/brand-icon.svg"
                                alt="Quizzo logo"
                                width={40}
                                height={40}
                                loading="eager"
                                className="w-9 h-9 sm:w-10 sm:h-10 object-contain transition-transform group-hover:scale-105 duration-300"
                            />
                            <span className="text-[21px] sm:text-[24px] font-black leading-none tracking-normal bg-gradient-to-br from-[#1F1B19] via-[#3A2B25] to-[#A56A43] bg-clip-text text-transparent drop-shadow-[0_1px_0_rgba(255,255,255,0.65)] max-[380px]:hidden">
                                Quizzo
                            </span>
                        </Link>
                    </div>

                    {/* Theme Toggle & Links */}
                    <div className="flex items-center gap-1.5 sm:gap-4 flex-shrink-0">
                        <button
                            aria-label="Toggle theme"
                            className="p-2 sm:p-2.5 rounded-full text-[#918B80] bg-white/40 border border-white/80 hover:bg-white/80 hover:text-[#8C5D3E] hover:rotate-[30deg] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[inset_0_2px_6px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.04)] backdrop-blur-xl"
                        >
                            <Sun className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                        </button>
                        <Link href="/login" className="text-[14px] sm:text-[15px] font-bold text-[#2C2A28] border border-[#2C2A28]/20 bg-transparent px-4 sm:px-6 py-2 sm:py-2.5 rounded-full hover:border-[#2C2A28]/40 hover:bg-[#2C2A28]/5 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 tracking-wide whitespace-nowrap">
                            Log in
                        </Link>
                        <Link href="/signup" className="text-[14px] sm:text-[15px] font-bold bg-[#2C2A28] text-[#FDFBFA] px-4 sm:px-6 py-2 sm:py-2.5 rounded-full hover:bg-[#1A1816] shadow-[0_8px_20px_rgba(44,42,40,0.2)] hover:shadow-[0_12px_24px_rgba(44,42,40,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_4px_10px_rgba(44,42,40,0.2)] transition-all duration-300 tracking-wide whitespace-nowrap">
                            Sign up
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
