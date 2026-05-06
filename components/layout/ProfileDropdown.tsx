"use client";

import { useState, useRef, useEffect } from "react";
import { UserCircle2, Settings, Mail, Shield } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { isLiveUserUpdatedEvent, type LiveUser, LIVE_USER_UPDATED_EVENT } from "@/lib/live-user-event";

interface ProfileDropdownProps {
  user: {
    name: string;
    email: string;
    role: string;
    username?: string;
  };
  roleName: string;
}

export default function ProfileDropdown({ user, roleName }: ProfileDropdownProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [liveUser, setLiveUser] = useState<LiveUser | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const currentUser = liveUser ?? session?.user ?? user;
  const currentRoleName =
    currentUser.role?.charAt(0).toUpperCase() + currentUser.role?.slice(1).toLowerCase() ||
    roleName;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleLiveUserUpdated(event: Event) {
      if (isLiveUserUpdatedEvent(event)) {
        setLiveUser(event.detail);
      }
    }

    window.addEventListener(LIVE_USER_UPDATED_EVENT, handleLiveUserUpdated);
    return () => window.removeEventListener(LIVE_USER_UPDATED_EVENT, handleLiveUserUpdated);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-white/60 px-5 py-2.5 rounded-full border border-white/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] backdrop-blur-md cursor-pointer hover:bg-white/80 transition-all duration-300 relative z-10"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[14px] font-bold text-[#2C2A28] tracking-wide">
            {currentUser.name}
          </span>
          <div className="w-[3px] h-[3px] rounded-full bg-[#918B80]/50"></div>
          <span className="text-[13px] font-bold text-[#8C5D3E]">
            {currentRoleName}
          </span>
        </div>
        <div className="w-8 h-8 rounded-full bg-[#2C2A28] text-white flex items-center justify-center shadow-sm">
          <UserCircle2 className="w-5 h-5 text-[#FDFBFA]" strokeWidth={2} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[28px] border border-white/95 bg-white/70 p-3 shadow-[0_22px_70px_rgba(44,42,40,0.18),inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-1px_0_rgba(255,255,255,0.55)] backdrop-blur-[34px] backdrop-saturate-150 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="absolute inset-0  pointer-events-none bg-white backdrop-blur-[28px] backdrop-saturate-150" />
          <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/85 to-transparent pointer-events-none" />
          <div className="absolute -top-16 -right-12 h-36 w-36 rounded-full bg-white/70 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-start gap-3 px-3 py-3 border-b border-[#E9E4DC]/80">
            <div className="w-12 h-12 rounded-2xl bg-[#E8F6FF] text-[#0284C7] flex items-center justify-center shadow-sm border border-white/90 flex-shrink-0">
              <span className="text-lg font-bold">{currentUser.name?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[16px] font-bold text-[#2C2A28] leading-tight truncate">
                {currentUser.name}
              </p>
              <div className="flex items-center gap-2 min-w-0">
                <p className="text-[13px] font-semibold text-[#8C5D3E] truncate">
                  @{currentUser.username || currentUser.name?.split(" ")[0]}
                </p>
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-bold text-sky-700 flex-shrink-0">
                  <Shield className="w-3 h-3" />
                  {currentRoleName}
                </span>
              </div>
              <p className="flex items-center gap-1.5 text-[13px] font-medium text-[#918B80] truncate">
                <Mail className="w-3.5 h-3.5 text-[#B8AFA4] flex-shrink-0" />
                <span className="truncate">{currentUser.email}</span>
              </p>
            </div>
          </div>

          <div className="relative z-10 flex flex-col p-2">
            <Link
              href="/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-[16px] text-[15px] font-bold text-[#2C2A28] hover:bg-white hover:shadow-sm transition-all group"
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
