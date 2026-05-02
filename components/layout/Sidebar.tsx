"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Upload,
  BookOpen,
  Users,
  ClipboardList,
  History,
  LogOut,
  Brain,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["STUDENT", "INSTRUCTOR", "ADMIN"] },
  { href: "/instructor/upload", label: "Upload PDF", icon: Upload, roles: ["INSTRUCTOR", "ADMIN"] },
  { href: "/instructor/quizzes", label: "My Quizzes", icon: BookOpen, roles: ["INSTRUCTOR", "ADMIN"] },
  { href: "/student/quizzes", label: "Browse Quizzes", icon: ClipboardList, roles: ["STUDENT", "INSTRUCTOR", "ADMIN"] },
  { href: "/student/results", label: "My Results", icon: History, roles: ["STUDENT", "INSTRUCTOR", "ADMIN"] },
  { href: "/admin/users", label: "Manage Users", icon: Users, roles: ["ADMIN"] },
  { href: "/admin/quizzes", label: "All Quizzes", icon: BookOpen, roles: ["ADMIN"] },
];

interface SidebarProps {
  role: string;
  userName: string;
}

export default function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname();

  const filteredNav = navItems.filter((item) => item.roles.includes(role));

  const roleColors: Record<string, string> = {
    ADMIN: "text-red-400 bg-red-400/10",
    INSTRUCTOR: "text-cyan-400 bg-cyan-400/10",
    STUDENT: "text-purple-400 bg-purple-400/10",
  };

  return (
    <aside className="w-64 min-h-screen bg-[#121214]/60 backdrop-blur-xl border-r border-white/[0.05] flex flex-col relative z-20">
      {/* Logo */}
      <div className="p-6 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.2)]"
            style={{ background: "linear-gradient(135deg, hsl(262 80% 65%), hsl(199 89% 48%))" }}>
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 tracking-tight">MCQify</span>
        </div>
      </div>

      {/* User info */}
      <div className="p-4 mx-4 mt-6 rounded-xl bg-black/20 border border-white/[0.05] backdrop-blur-sm">
        <p className="font-medium text-sm text-white/90 truncate">{userName}</p>
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full mt-1.5 inline-block ${roleColors[role] || "text-white/40 bg-white/5"}`}>
          {role}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 group ${
                isActive
                  ? "bg-gradient-to-r from-purple-500/10 to-cyan-500/10 text-white border border-white/[0.08] shadow-[0_4px_20px_-4px_rgba(139,92,246,0.1)]"
                  : "text-white/50 hover:text-white/90 hover:bg-white/[0.04]"
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 transition-colors ${isActive ? "text-purple-400" : "group-hover:text-cyan-400"}`} />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-cyan-400 opacity-70" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-white/[0.05]">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-red-400 hover:bg-red-400/10 hover:shadow-[0_0_15px_rgba(248,113,113,0.1)] transition-all duration-300 border border-transparent hover:border-red-400/20"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
