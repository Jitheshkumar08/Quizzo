"use client";

import { useState, useRef, useEffect } from "react";
import { UserCircle2, Settings, Mail, User as UserIcon } from "lucide-react";
import Link from "next/link";

interface ProfileDropdownProps {
  user: {
    name: string;
    email: string;
    role: string;
  };
  roleName: string;
}

export default function ProfileDropdown({ user, roleName }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-white/60 px-5 py-2.5 rounded-full border border-white/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] backdrop-blur-md cursor-pointer hover:bg-white/80 transition-all duration-300 relative z-10"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[14px] font-bold text-[#2C2A28] tracking-wide">
            {user.name}
          </span>
          <div className="w-[3px] h-[3px] rounded-full bg-[#918B80]/50"></div>
          <span className="text-[13px] font-bold text-[#8C5D3E]">
            {roleName}
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#2C2A28] text-white flex items-center justify-center shadow-sm">
          <UserCircle2 className="w-5 h-5 text-[#FDFBFA]" strokeWidth={2} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-[300px] bg-[#FDFBFA]/95 backdrop-blur-2xl border border-white max-w-sm shadow-[0_12px_40px_rgba(0,0,0,0.08)] rounded-[24px] p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col px-4 py-3 border-b border-[#E9E4DC]">
            <p className="text-[16px] font-bold text-[#2C2A28] flex items-center gap-2">
              {user.name}
            </p>
            <p className="text-[13px] font-bold text-[#8C5D3E] mt-0.5">
              @{(user as any).username || user.name?.split(' ')[0]}
            </p>
            <p className="text-[14px] font-medium text-[#918B80] truncate mt-0.5">
              {user.email}
            </p>
          </div>

          <div className="flex flex-col p-2">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[14px] text-[15px] font-bold text-[#2C2A28] hover:bg-white/80 hover:shadow-sm transition-all group"
            >
              <Settings className="w-4 h-4 text-[#918B80] group-hover:text-[#2C2A28] transition-colors" />
              Settings
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}