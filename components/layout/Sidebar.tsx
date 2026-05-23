"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FilePlus,
  BookOpen,
  Users,
  ClipboardList,
  ClipboardCheck,
  History,
  ShieldAlert,
  Menu,
  X,
  LogOut,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { isLiveUserUpdatedEvent, LIVE_USER_UPDATED_EVENT } from "@/lib/live-user-event";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  group?: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["STUDENT", "INSTRUCTOR", "MOD", "ADMIN"], group: "Main" },
  { href: "/instructor/upload", label: "Set a Quiz", icon: FilePlus, roles: ["INSTRUCTOR", "MOD", "ADMIN"], group: "Main" },
  { href: "/instructor/quizzes", label: "My Quizzes", icon: BookOpen, roles: ["INSTRUCTOR", "MOD", "ADMIN"], group: "Main" },
  { href: "/student/quizzes", label: "Browse Quizzes", icon: ClipboardList, roles: ["STUDENT", "INSTRUCTOR", "MOD", "ADMIN"], group: "Main" },
  { href: "/student/results", label: "My Results", icon: History, roles: ["STUDENT", "INSTRUCTOR", "MOD", "ADMIN"], group: "Main" },
  { href: "/admin/users", label: "Manage Users", icon: Users, roles: ["MOD", "ADMIN"], group: "Admin" },
  { href: "/admin/quizzes", label: "All Quizzes", icon: ShieldAlert, roles: ["MOD", "ADMIN"], group: "Admin" },
  { href: "/admin/attempts", label: "All Attempts", icon: ClipboardCheck, roles: ["MOD", "ADMIN"], group: "Admin" },
];

interface SidebarProps {
  role: string;
  initialCollapsed: boolean;
}

export default function Sidebar({ role, initialCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const [liveRole, setLiveRole] = useState<string | null>(null);
  const currentRole = liveRole ?? role;

  const mainNav = navItems.filter((item) => item.roles.includes(currentRole) && item.group === "Main");
  const adminNav = navItems.filter((item) => item.roles.includes(currentRole) && item.group === "Admin");
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [showScrollHint, setShowScrollHint] = useState(false);
  const navRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const savedLocalState = localStorage.getItem("sidebarCollapsed");
      if (!initialCollapsed && savedLocalState === "true") {
        setIsCollapsed(true);
        document.cookie = "sidebarCollapsed=true; path=/; max-age=31536000; samesite=lax";
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [initialCollapsed]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const newState = !prev;
      localStorage.setItem("sidebarCollapsed", String(newState));
      document.cookie = `sidebarCollapsed=${String(newState)}; path=/; max-age=31536000; samesite=lax`;
      return newState;
    });
  };

  useEffect(() => {
    function handleLiveUserUpdated(event: Event) {
      if (isLiveUserUpdatedEvent(event)) {
        setLiveRole(event.detail.role);
      }
    }

    window.addEventListener(LIVE_USER_UPDATED_EVENT, handleLiveUserUpdated);
    return () => window.removeEventListener(LIVE_USER_UPDATED_EVENT, handleLiveUserUpdated);
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const scrollContainer = nav;

    function updateScrollHint() {
      setShowScrollHint(scrollContainer.scrollTop + scrollContainer.clientHeight < scrollContainer.scrollHeight - 8);
    }

    updateScrollHint();
    const frame = window.requestAnimationFrame(updateScrollHint);
    scrollContainer.addEventListener("scroll", updateScrollHint, { passive: true });
    window.addEventListener("resize", updateScrollHint);

    return () => {
      window.cancelAnimationFrame(frame);
      scrollContainer.removeEventListener("scroll", updateScrollHint);
      window.removeEventListener("resize", updateScrollHint);
    };
  }, [currentRole, isOpen, pathname]);

  function scrollNavDown() {
    navRef.current?.scrollBy({ top: 96, behavior: "smooth" });
  }

  return (
    <>
      {/* Mobile Hamburger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="md:hidden fixed top-[22px] left-5 z-[60] w-11 h-11 bg-[#F4EFE6]/40 backdrop-blur-md rounded-[16px] shadow-sm border border-[#E9E4DC] text-[#4A453F] flex items-center justify-center cursor-pointer active:scale-95 transition-all"
          aria-label="Open Menu"
        >
          <Menu className="w-6 h-6" strokeWidth={2.5} />
        </button>
      )}

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-[#2C2A28]/20 backdrop-blur-sm z-[70] transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside suppressHydrationWarning className={`flex-shrink-0 h-[100dvh] bg-[#F4EFE6]/90 backdrop-blur-2xl flex flex-col fixed md:relative z-[80] md:z-20 transition-all duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 w-[260px] ${isCollapsed ? "md:w-[88px]" : "md:w-[260px]"}`}>

        {/* Right Border & Shadow starting exclusively below the navbar on desktop to avoid cutting the logo */}
        <div className="absolute top-[88px] bottom-0 right-0 w-px shadow-[4px_0_24px_rgba(163,149,126,0.12)] bg-[#E9E4DC] pointer-events-none z-10 hidden md:block" />
        <div className="absolute top-0 bottom-0 right-0 w-px shadow-[4px_0_24px_rgba(163,149,126,0.12)] bg-[#E9E4DC] pointer-events-none z-10 md:hidden" />

        {/* Desktop Collapse Toggle - Specifically pushed down below the header bar */}
        <button
          onClick={toggleCollapse}
          className="hidden cursor-pointer md:flex absolute -right-3.5 top-[108px] z-50 h-7 w-7 rounded border border-[#E9E4DC] bg-[#FFFDF9] items-center justify-center text-[#918B80] shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:text-[#2C2A28] hover:bg-[#F8F3EA] transition-colors"
          aria-label={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="md:hidden absolute top-7 right-4 p-2 text-[#918B80] hover:bg-black/5 rounded-lg z-50 transition-colors cursor-pointer"
          aria-label="Close Menu"
        >
          <X className="w-5 h-5" />
        </button>
        {/* Glossy highlight */}
        <div className="absolute top-[88px] right-0 w-1/2 h-[calc(100%-88px)] bg-gradient-to-l from-white/40 to-transparent pointer-events-none"></div>

        {/* Logo - precisely h-[88px] to align mathematically with the main TopBar */}
        <div className="h-[88px] w-full md:w-[260px] border-b border-[#E9E4DC] relative z-30 bg-transparent flex items-center px-6">
          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/50 to-transparent pointer-events-none z-0" />
          <Link href="/" className="flex items-center gap-3 group px-1 relative z-10 w-full">
            <Image
              src="/brand-icon.svg"
              alt="Quizzo logo"
              width={40}
              height={40}
              loading="eager"
              className="w-10 h-10 object-contain transition-transform group-hover:scale-105 duration-300 flex-shrink-0"
            />
            <span className="text-[24px] font-black leading-none tracking-normal bg-gradient-to-br from-[#1F1B19] via-[#3A2B25] to-[#A56A43] bg-clip-text text-transparent drop-shadow-[0_1px_0_rgba(255,255,255,0.65)] whitespace-nowrap overflow-hidden transition-all duration-300">
              Quizzo
            </span>
          </Link>
        </div>

        {/* Nav */}
        <div className="relative z-10 min-h-0 flex-1 overflow-hidden">
          <nav ref={navRef} className={`h-full space-y-1.5 overflow-y-auto overflow-x-hidden py-6 pb-14 ${isCollapsed ? 'md:px-3 px-4' : 'px-4'}`}>
            <div className={`mb-4 px-2 text-[11px] font-bold text-[#918B80] uppercase tracking-widest whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'md:hidden' : 'block'}`}>
              Main Menu
            </div>
            {isCollapsed && (
              <div className="mb-4 h-[15px] border-b border-[#E9E4DC] hidden md:block" />
            )}

            {mainNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center gap-3 py-3 rounded-full text-[15px] font-bold transition-all duration-300 group ${isCollapsed ? 'md:justify-center px-4 md:px-0' : 'px-4'} ${isActive
                    ? "bg-white/80 text-[#8C5D3E] border border-white shadow-[0_4px_12px_rgba(163,149,126,0.15)]"
                    : "text-[#918B80] hover:text-[#2C2A28] hover:bg-white/40 border border-transparent"
                    }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? "text-[#8C5D3E]" : "group-hover:text-[#2C2A28]"}`} />
                  <span className={`flex-1 whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'md:hidden' : 'block'}`}>{item.label}</span>
                </Link>
              );
            })}

            {adminNav.length > 0 && (
              <>
                <div className={`mt-8 mb-4 px-2 text-[11px] font-bold text-[#918B80] uppercase tracking-widest pt-4 border-t border-[#E9E4DC]/60 whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'md:hidden' : 'block'}`}>
                  {currentRole === "MOD" ? "Mod Controls" : "Admin Controls"}
                </div>
                {isCollapsed && (
                  <div className="mt-8 mb-4 h-[15px] border-t border-[#E9E4DC]/60 hidden md:block" />
                )}
                
                {adminNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isCollapsed ? item.label : undefined}
                      className={`flex items-center gap-3 py-3 rounded-full text-[15px] font-bold transition-all duration-300 group ${isCollapsed ? 'md:justify-center px-4 md:px-0' : 'px-4'} ${isActive
                        ? "bg-[#2C2A28] text-white shadow-[0_4px_12px_rgba(44,42,40,0.2)]"
                        : "text-[#918B80] hover:text-[#2C2A28] hover:bg-black/5"
                        }`}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? "text-white" : "group-hover:text-[#2C2A28]"}`} />
                      <span className={`flex-1 whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'md:hidden' : 'block'}`}>{item.label}</span>
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {showScrollHint && (
            <button
              type="button"
              onClick={scrollNavDown}
              className="absolute bottom-3 left-1/2 z-20 flex h-8 w-10 -translate-x-1/2 cursor-pointer items-center justify-center text-[#6E482F] drop-shadow-[0_1px_0_rgba(255,255,255,0.85)] transition-all duration-200 hover:-translate-y-0.5 hover:text-[#2C2A28] active:translate-y-0"
              aria-label="Scroll menu down"
              title="More menu items"
            >
              <ChevronDown className="h-5 w-5 animate-[bounce_1.8s_infinite]" strokeWidth={3.2} />
            </button>
          )}

          {showScrollHint && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-11 bg-gradient-to-t from-[#F4EFE6]/72 via-[#F4EFE6]/34 to-transparent" />
          )}
        </div>

        {/* Logout (Desktop) */}
        <div className="p-5 border-t border-[#E9E4DC]/60 relative z-10 hidden md:flex justify-center">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title={isCollapsed ? "Logout" : undefined}
            className={`group relative flex h-[45px] w-[45px] cursor-pointer items-center justify-start overflow-hidden rounded-full border-0 bg-[#ff4141] text-white shadow-[2px_2px_10px_rgba(0,0,0,0.199)] transition-[width,border-radius,transform] duration-300 ease-in-out active:translate-x-0.5 active:translate-y-0.5 ${!isCollapsed ? 'hover:w-[125px] hover:rounded-[40px]' : ''}`}
            aria-label="Sign out"
          >
            <span className={`flex w-[45px] shrink-0 items-center justify-center text-white transition-[width,padding-left] duration-300 ease-in-out ${!isCollapsed ? 'group-hover:w-[30%] group-hover:pl-5' : ''}`}>
              <LogOut className="h-[17px] w-[17px] text-white" strokeWidth={3} aria-hidden="true" />
            </span>
            {!isCollapsed && (
              <span className="absolute right-0 w-0 whitespace-nowrap text-center text-base font-bold text-white opacity-0 transition-[width,opacity,padding-right] duration-300 ease-in-out group-hover:w-[70%] group-hover:pr-2.5 group-hover:opacity-100">
                Logout
              </span>
            )}
          </button>
        </div>

        {/* Logout (Mobile) */}
        <div className="p-5 border-t border-[#E9E4DC]/60 relative z-10 flex md:hidden justify-center">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center justify-center gap-3 w-full h-[45px] rounded-[40px] bg-[#ff4141] text-white shadow-[2px_2px_10px_rgba(0,0,0,0.199)] font-bold active:translate-y-0.5 transition-transform"
          >
            <LogOut className="h-[17px] w-[17px] text-white" strokeWidth={3} aria-hidden="true" />
            <span className="text-base text-white">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
