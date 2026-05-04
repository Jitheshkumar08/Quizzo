"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  FilePlus,
  BookOpen,
  Users,
  ClipboardList,
  History,
  Brain,
  ChevronRight,
  Settings,
  ShieldAlert,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  group?: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["STUDENT", "INSTRUCTOR", "ADMIN"], group: "Main" },
  { href: "/instructor/upload", label: "Set a Quiz", icon: FilePlus, roles: ["INSTRUCTOR", "ADMIN"], group: "Main" },
  { href: "/instructor/quizzes", label: "My Quizzes", icon: BookOpen, roles: ["INSTRUCTOR", "ADMIN"], group: "Main" },
  { href: "/student/quizzes", label: "Browse Quizzes", icon: ClipboardList, roles: ["STUDENT", "INSTRUCTOR", "ADMIN"], group: "Main" },
  { href: "/student/results", label: "My Results", icon: History, roles: ["STUDENT", "INSTRUCTOR", "ADMIN"], group: "Main" },
  { href: "/admin/users", label: "Manage Users", icon: Users, roles: ["ADMIN"], group: "Admin" },
  { href: "/admin/quizzes", label: "All Quizzes", icon: ShieldAlert, roles: ["ADMIN"], group: "Admin" },
];

interface SidebarProps {
  role: string;
  userName: string;
}

export default function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();

  const mainNav = navItems.filter((item) => item.roles.includes(role) && item.group === "Main");
  const adminNav = navItems.filter((item) => item.roles.includes(role) && item.group === "Admin");
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-7 left-5 z-[60] p-2 bg-[#F4EFE6]/90 backdrop-blur-md rounded-xl shadow-sm border border-white/80 text-[#2C2A28]"
        aria-label="Open Menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-[#2C2A28]/20 backdrop-blur-sm z-[70] transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`w-[260px] flex-shrink-0 h-[100dvh] bg-[#F4EFE6]/90 backdrop-blur-2xl border-r border-white/80 flex flex-col fixed md:relative z-[80] md:z-20 shadow-[4px_0_24px_rgba(163,149,126,0.1)] transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        {/* Mobile Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="md:hidden absolute top-7 right-4 p-2 text-[#918B80] hover:bg-black/5 rounded-lg z-50 transition-colors cursor-pointer"
          aria-label="Close Menu"
        >
          <X className="w-5 h-5" />
        </button>
        {/* Glossy highlight */}
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/40 to-transparent pointer-events-none"></div>

        {/* Logo - precisely h-[88px] to align mathematically with the main TopBar */}
        <div className="h-[88px] flex items-center border-b border-[#E9E4DC]/60 relative z-10 px-6">
          <Link href="/" className="flex items-center gap-3 group px-1">
            <img
              src="/brand-icon.svg"
              alt="MCQify logo"
              width={40}
              height={40}
              className="w-10 h-10 object-contain transition-transform group-hover:scale-105 duration-300"
            />
            <span className="font-bold text-[22px] tracking-tight text-[#2C2A28]">
              MCQify
            </span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto relative z-10 overflow-x-hidden">
          <div className="mb-4 px-2 text-[11px] font-bold text-[#918B80] uppercase tracking-widest">Main Menu</div>
          {mainNav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-full text-[15px] font-bold transition-all duration-300 group ${isActive
                  ? "bg-white/80 text-[#8C5D3E] border border-white shadow-[0_4px_12px_rgba(163,149,126,0.15)]"
                  : "text-[#918B80] hover:text-[#2C2A28] hover:bg-white/40"
                  }`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? "text-[#8C5D3E]" : "group-hover:text-[#2C2A28]"}`} />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}

          {adminNav.length > 0 && (
            <>
              <div className="mt-8 mb-4 px-2 text-[11px] font-bold text-[#918B80] uppercase tracking-widest pt-4 border-t border-[#E9E4DC]/60">Admin Controls</div>
              {adminNav.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-full text-[15px] font-bold transition-all duration-300 group ${isActive
                      ? "bg-[#2C2A28] text-white shadow-[0_4px_12px_rgba(44,42,40,0.2)]"
                      : "text-[#918B80] hover:text-[#2C2A28] hover:bg-black/5"
                      }`}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 transition-colors ${isActive ? "text-white" : "group-hover:text-[#2C2A28]"}`} />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Logout */}
        <div className="p-5 border-t border-[#E9E4DC]/60 relative z-10 flex justify-center md:justify-center">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="logout-btn"
            aria-label="Sign out"
          >
            <span className="logout-sign">
              <svg viewBox="0 0 512 512" aria-hidden="true">
                <path d="M377.9 105.9L500.7 228.7c7.2 7.2 11.3 17.1 11.3 27.3s-4.1 20.1-11.3 27.3L377.9 406.1c-6.4 6.4-15 9.9-24 9.9c-18.7 0-33.9-15.2-33.9-33.9l0-62.1-128 0c-17.7 0-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32l128 0 0-62.1c0-18.7 15.2-33.9 33.9-33.9c9 0 17.6 3.6 24 9.9zM160 96L96 96c-17.7 0-32 14.3-32 32l0 256c0 17.7 14.3 32 32 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-64 0c-53 0-96-43-96-96L0 128C0 75 43 32 96 32l64 0c17.7 0 32 14.3 32 32s-14.3 32-32 32z" />
              </svg>
            </span>
            <span className="logout-text">Logout</span>
          </button>
        </div>
        <style jsx>{`
          .logout-btn {
            display: flex;
            align-items: center;
            justify-content: flex-start;
            width: 45px;
            height: 45px;
            border: none;
            border-radius: 9999px;
            cursor: pointer;
            position: relative;
            overflow: hidden;
            transition: width 0.3s ease, border-radius 0.3s ease, transform 0.1s ease;
            box-shadow: 2px 2px 10px rgba(0, 0, 0, 0.199);
            background-color: rgb(255, 65, 65);
          }

          .logout-sign {
            width: 100%;
            transition: width 0.3s ease, padding-left 0.3s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }

          .logout-sign svg {
            width: 17px;
            display: block;
          }

          .logout-sign svg path {
            fill: white;
          }

          .logout-text {
            position: absolute;
            right: 0;
            width: 0;
            opacity: 0;
            color: white;
            font-size: 1rem;
            font-weight: 700;
            transition: width 0.3s ease, opacity 0.3s ease, padding-right 0.3s ease;
            white-space: nowrap;
            text-align: center;
          }

          .logout-btn:hover {
            width: 125px;
            border-radius: 40px;
          }

          .logout-btn:hover .logout-sign {
            width: 30%;
            padding-left: 20px;
          }

          .logout-btn:hover .logout-text {
            opacity: 1;
            width: 70%;
            padding-right: 10px;
          }

          .logout-btn:active {
            transform: translate(2px, 2px);
          }

          @media (max-width: 767px) {
            .logout-btn {
              width: 100%;
              border-radius: 40px;
            }

            .logout-sign {
              width: 30%;
              padding-left: 20px;
            }

            .logout-text {
              opacity: 1;
              width: 70%;
              padding-right: 10px;
              position: static;
            }
          }
        `}</style>
      </aside>
    </>
  );
}
