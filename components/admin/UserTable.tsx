"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { useMemo } from "react";
import Link from "next/link";
import { Activity, ArrowDownWideNarrow, ArrowUpNarrowWide, Loader2, Mail, BookOpen, BarChart3, Calendar, ChevronDown, Check, ExternalLink, Settings, Search, Clock3, LayoutGrid, Table2 } from "lucide-react";
import PaginationControls from "@/components/ui/PaginationControls";
import { formatAppDate, formatAppTime } from "@/lib/timezone";
import { ADMIN_ASSIGNABLE_ROLES, MOD_ASSIGNABLE_ROLES, type AppRole } from "@/lib/roles";

interface User {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: AppRole;
  createdAt: string;
  lastSeenAt?: string | null;
  profileImageUrl?: string | null;
  _count: { quizzes: number; results: number };
}

type SortField = "quizzes" | "attempts" | "joined" | "lastOnline";
type SortDirection = "asc" | "desc";
type ViewMode = "table" | "grid";
const PAGE_SIZE = 20;

function subscribeToViewport(callback: () => void) {
  const media = window.matchMedia("(min-width: 768px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getDesktopSnapshot() {
  return window.matchMedia("(min-width: 768px)").matches;
}

function getServerDesktopSnapshot() {
  return true;
}

const roleConfig: Record<string, {
  gradient: string;
  pill: string;
  avatarBg: string;
  avatarText: string;
  dropdownHover: string;
  checkColor: string;
  label: string;
}> = {
  ADMIN: {
    gradient: "from-rose-500 to-red-600",
    pill: "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-rose-200",
    avatarBg: "bg-rose-100",
    avatarText: "text-rose-600",
    dropdownHover: "hover:bg-rose-50 hover:text-rose-700",
    checkColor: "text-rose-600",
    label: "Admin",
  },
  MOD: {
    gradient: "from-teal-500 to-cyan-600",
    pill: "bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-teal-200",
    avatarBg: "bg-teal-100",
    avatarText: "text-teal-600",
    dropdownHover: "hover:bg-teal-50 hover:text-teal-700",
    checkColor: "text-teal-600",
    label: "Mod",
  },
  INSTRUCTOR: {
    gradient: "from-sky-500 to-blue-600",
    pill: "bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-sky-200",
    avatarBg: "bg-sky-100",
    avatarText: "text-sky-600",
    dropdownHover: "hover:bg-sky-50 hover:text-sky-700",
    checkColor: "text-sky-600",
    label: "Instructor",
  },
  STUDENT: {
    gradient: "from-violet-500 to-purple-600",
    pill: "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-violet-200",
    avatarBg: "bg-violet-100",
    avatarText: "text-violet-600",
    dropdownHover: "hover:bg-violet-50 hover:text-violet-700",
    checkColor: "text-violet-600",
    label: "Student",
  },
};

function formatDate(iso: string) {
  const date = formatAppDate(iso);
  const time = formatAppTime(iso);
  return { date, time };
}

function formatLastOnline(iso?: string | null) {
  if (!iso) {
    return {
      label: "Never",
      detail: "No activity yet",
    };
  }

  const { date, time } = formatDate(iso);
  return {
    label: date,
    detail: time,
  };
}

function Avatar({ name, role, imageUrl }: { name: string; role: string; imageUrl?: string | null }) {
  const cfg = roleConfig[role];
  return (
    <div className={`relative w-10 h-10 rounded-full ${cfg.avatarBg} flex items-center justify-center flex-shrink-0 font-black text-base ${cfg.avatarText} shadow-[0_6px_14px_rgba(44,42,40,0.14)] ring-2 ring-[#EEE6DA] border border-white/90 overflow-hidden`}>
      {imageUrl ? (
        <>
          <span aria-hidden="true" className="absolute inset-0 bg-[#F6F1E8]" />
          <span
            aria-hidden="true"
            className="relative h-full w-full bg-cover bg-center"
            style={{ backgroundImage: `url("${imageUrl}")` }}
          />
        </>
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

function RolePill({ role, isYou }: { role: string; isYou?: boolean }) {
  const cfg = roleConfig[role];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full font-bold tracking-wide shadow-sm ${cfg.pill}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
      {cfg.label}{isYou ? " (you)" : ""}
    </span>
  );
}

function RoleDropdown({
  role,
  userId,
  updating,
  allowedRoles,
  onChange,
}: {
  role: AppRole;
  userId: string;
  updating: string | null;
  allowedRoles: readonly AppRole[];
  onChange: (userId: string, role: AppRole) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = roleConfig[role];

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (updating === userId) {
    return (
      <div className={`inline-flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-full font-bold shadow-sm ${cfg.pill}`}>
        <Loader2 className="w-3 h-3 animate-spin" />
        Saving…
      </div>
    );
  }

  return (
    <div ref={ref} className="relative inline-block">
      {/* Trigger button — looks exactly like the pill */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex cursor-pointer items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-full font-bold tracking-wide shadow-sm transition-all duration-150 hover:brightness-110 active:scale-95 ${cfg.pill}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
        {cfg.label}
        <ChevronDown className={`w-3 h-3 ml-0.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute left-0 top-full mt-2 z-50 w-40 bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E8E2D9] py-1.5 overflow-hidden">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-[#B0A89E] px-3 pt-1.5 pb-2">Change Role</p>
          {allowedRoles.map((r) => {
            const rcfg = roleConfig[r];
            const isActive = r === role;
            return (
              <button
                key={r}
                onClick={() => {
                  setOpen(false);
                  if (r !== role) onChange(userId, r);
                }}
                className={`w-full flex cursor-pointer items-center justify-between px-3 py-2 text-[12px] font-bold transition-colors duration-100 ${isActive
                  ? "bg-[#F5EDE2] text-[#2C2A28]"
                  : `text-[#4A4744] ${rcfg.dropdownHover}`
                  }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full bg-gradient-to-br ${rcfg.gradient}`} />
                  {rcfg.label}
                </span>
                {isActive && <Check className={`w-3.5 h-3.5 ${rcfg.checkColor}`} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DisabledAccountButton({ compact = false }: { compact?: boolean }) {
  return (
    <span
      aria-disabled="true"
      title="Moderators cannot open account settings"
      className={`${compact ? "inline-flex" : "flex"} cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-[#D8CFC3] bg-white/45 px-4 py-3 text-[12px] font-black text-[#A09890] opacity-60 shadow-sm`}
    >
      <Settings className="w-4 h-4 text-[#A09890]" />
      {compact ? "Open" : "Open Account"}
      <ExternalLink className="w-3.5 h-3.5 text-[#B8AFA4]" />
    </span>
  );
}

export default function UserTable({
  currentUserId,
  viewerRole,
}: {
  currentUserId: string;
  viewerRole: AppRole;
}) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [usernameQuery, setUsernameQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("joined");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [activeUserIds, setActiveUserIds] = useState<Set<string>>(new Set());
  const [activeLoading, setActiveLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const isDesktop = useSyncExternalStore(
    subscribeToViewport,
    getDesktopSnapshot,
    getServerDesktopSnapshot
  );
  const [selectedViewMode, setSelectedViewMode] = useState<ViewMode | null>(null);
  const viewMode = selectedViewMode ?? (isDesktop ? "table" : "grid");

  const loadUsers = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true);

    const res = await fetch("/api/admin/users", { credentials: "include" });
    const data = await res.json();
    if (res.ok && Array.isArray(data)) {
      setUsers(data);
    }

    if (!silent) setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  useEffect(() => {
    if (!onlineOnly) return;

    const controller = new AbortController();

    fetch("/api/admin/users/active", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(data.ids)) {
          setActiveUserIds(new Set());
          return;
        }
        setActiveUserIds(new Set(data.ids.filter((id: unknown): id is string => typeof id === "string")));
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setActiveUserIds(new Set());
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setActiveLoading(false);
        }
      });

    return () => controller.abort();
  }, [onlineOnly]);

  const allowedRoleOptions = viewerRole === "MOD" ? MOD_ASSIGNABLE_ROLES : ADMIN_ASSIGNABLE_ROLES;

  function canShowRoleDropdown(user: User) {
    if (user.id === currentUserId) return false;
    if (viewerRole === "MOD") return user.role === "STUDENT" || user.role === "INSTRUCTOR";
    return user.role !== "ADMIN";
  }

  async function changeRole(userId: string, role: AppRole) {
    setUpdating(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: data.role } : u))
        );
      } else {
        alert(data.error);
      }
    } finally {
      setUpdating(null);
    }
  }

  const normalizedUsernameQuery = usernameQuery.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;
    const usernameFiltered = normalizedUsernameQuery
      ? users.filter((user) => user.username.toLowerCase().includes(normalizedUsernameQuery))
      : users;
    const presenceFiltered = onlineOnly
      ? usernameFiltered.filter((user) => activeUserIds.has(user.id))
      : usernameFiltered;

    return [...presenceFiltered].sort((a, b) => {
      if (sortField === "quizzes") {
        const countDiff = a._count.quizzes - b._count.quizzes;
        if (countDiff !== 0) return countDiff * direction;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      if (sortField === "attempts") {
        const countDiff = a._count.results - b._count.results;
        if (countDiff !== 0) return countDiff * direction;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      if (sortField === "lastOnline") {
        const aTime = a.lastSeenAt ? new Date(a.lastSeenAt).getTime() : 0;
        const bTime = b.lastSeenAt ? new Date(b.lastSeenAt).getTime() : 0;
        const seenDiff = aTime - bTime;
        if (seenDiff !== 0) return seenDiff * direction;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * direction;
    });
  }, [activeUserIds, normalizedUsernameQuery, onlineOnly, sortDirection, sortField, users]);
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const page = Math.min(currentPage, totalPages);
  const pageStartIndex = (page - 1) * PAGE_SIZE;
  const paginatedUsers = filteredUsers.slice(pageStartIndex, pageStartIndex + PAGE_SIZE);
  const startItem = filteredUsers.length === 0 ? 0 : pageStartIndex + 1;
  const endItem = Math.min(pageStartIndex + paginatedUsers.length, filteredUsers.length);

  function toggleSort(field: SortField) {
    setCurrentPage(1);
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(field);
    setSortDirection("desc");
  }

  function goToPreviousPage() {
    setCurrentPage((value) => Math.max(1, Math.min(value, totalPages) - 1));
  }

  function goToNextPage() {
    setCurrentPage((value) => Math.min(totalPages, Math.min(value, totalPages) + 1));
  }

  function renderSortIndicator(field: SortField) {
    const iconClassName = "h-3.5 w-3.5 stroke-[2.6] text-[#B0A89E]";
    const activeIconClassName = "h-3.5 w-3.5 stroke-[2.8] text-[#6B6357]";

    if (sortField !== field) {
      return (
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
          <ArrowDownWideNarrow className={iconClassName} aria-hidden="true" />
        </span>
      );
    }

    return (
      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
        {sortDirection === "asc" ? (
          <ArrowUpNarrowWide className={activeIconClassName} aria-hidden="true" />
        ) : (
          <ArrowDownWideNarrow className={activeIconClassName} aria-hidden="true" />
        )}
      </span>
    );
  }

  function renderSortHeader(field: SortField, label: string) {
    return (
      <button
        type="button"
        onClick={() => toggleSort(field)}
        className="inline-flex h-5 cursor-pointer select-none items-center gap-1.5 whitespace-nowrap text-[10px] font-black uppercase leading-none tracking-[0.12em] text-[#8C6D50] transition-colors hover:text-[#2C2A28]"
        aria-label={`Sort by ${label}`}
        aria-pressed={sortField === field}
      >
        <span>{label}</span>
        {renderSortIndicator(field)}
      </button>
    );
  }

  function toggleOnlineOnly() {
    setCurrentPage(1);
    setOnlineOnly((value) => {
      const nextValue = !value;
      if (nextValue) {
        setActiveLoading(true);
      } else {
        setActiveLoading(false);
      }
      return nextValue;
    });
  }

  function renderUserCard(user: User) {
    const { date } = formatDate(user.createdAt);
    const isYou = user.id === currentUserId;
    const lastOnline = formatLastOnline(user.lastSeenAt);

    return (
      <div key={user.id} className="glass rounded-[22px] border border-white/20 p-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <Avatar name={user.fullName} role={user.role} imageUrl={user.profileImageUrl} />
              <div className="min-w-0">
                <p className="whitespace-normal break-words text-[15px] font-bold leading-tight text-[#1E1C1A]">{user.fullName}</p>
                <p className="mt-0.5 break-words text-[11px] font-semibold text-[#A09890]">@{user.username}</p>
              </div>
            </div>
            <div className="flex max-w-[42%] flex-shrink-0 justify-end">
              {canShowRoleDropdown(user) ? (
                <RoleDropdown role={user.role} userId={user.id} updating={updating} allowedRoles={allowedRoleOptions} onChange={changeRole} />
              ) : (
                <RolePill role={user.role} isYou={isYou} />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[#E0D9CF] bg-[#EDE8E0]/60 px-3 py-2.5">
            <Mail className="h-3.5 w-3.5 flex-shrink-0 text-[#A09890]" />
            <span className="truncate text-[12px] font-semibold text-[#4A4744]">{user.email}</span>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl border border-[#E8E2D9] bg-white/60 px-2 py-3 text-center shadow-sm">
              <BookOpen className="mx-auto mb-1 h-3.5 w-3.5 text-sky-500" />
              <p className="text-[10px] font-black uppercase tracking-widest text-[#B0A89E]">Quizzes</p>
              <p className="mt-0.5 text-base font-black text-[#1E1C1A]">{user._count.quizzes}</p>
            </div>
            <div className="rounded-2xl border border-[#E8E2D9] bg-white/60 px-2 py-3 text-center shadow-sm">
              <BarChart3 className="mx-auto mb-1 h-3.5 w-3.5 text-violet-500" />
              <p className="text-[10px] font-black uppercase tracking-widest text-[#B0A89E]">Attempts</p>
              <p className="mt-0.5 text-base font-black text-[#1E1C1A]">{user._count.results}</p>
            </div>
            <div className="rounded-2xl border border-[#E8E2D9] bg-white/60 px-2 py-3 text-center shadow-sm">
              <Calendar className="mx-auto mb-1 h-3.5 w-3.5 text-rose-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-[#B0A89E]">Joined</p>
              <p className="mt-0.5 text-[11px] font-black leading-tight text-[#1E1C1A]">{date}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-[#E0D9CF] bg-[#EDE8E0]/60 px-3 py-2.5">
            <Clock3 className="h-3.5 w-3.5 flex-shrink-0 text-[#A09890]" />
            <span className="text-[12px] font-black text-[#4A4744]">Last online</span>
            <span className="min-w-0 truncate text-[12px] font-semibold text-[#918B80]">
              {lastOnline.label === "Never" ? lastOnline.label : `${lastOnline.label} ${lastOnline.detail}`}
            </span>
          </div>

          {viewerRole === "MOD" ? (
            <DisabledAccountButton />
          ) : (
            <Link
              href={`/admin/users/${user.id}`}
              className="flex items-center justify-center gap-2 rounded-2xl border border-[#D8CFC3] bg-white/70 px-4 py-3 text-[12px] font-black text-[#3D3A37] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
            >
              <Settings className="h-4 w-4 text-[#8C6D50]" />
              Open Account
              <ExternalLink className="h-3.5 w-3.5 text-[#A09890]" />
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
        <p className="text-sm text-[#918B80] font-medium">Loading users…</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="order-2 flex flex-wrap items-center gap-3 sm:order-1">
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#A09890]">
            {filteredUsers.length} of {users.length} matched
          </p>
        </div>
        <div className="order-1 flex w-full flex-wrap items-center justify-between gap-3 sm:order-2 sm:w-auto sm:flex-nowrap sm:justify-start">
          <button
            type="button"
            onClick={toggleOnlineOnly}
            title="Online now"
            className={`order-1 inline-flex h-12 w-12 cursor-pointer items-center justify-center gap-2 rounded-full border px-0 text-xs font-black shadow-[0_10px_28px_rgba(44,42,40,0.07)] transition-all active:scale-[0.98] sm:order-none sm:w-auto sm:rounded-2xl sm:px-5 ${onlineOnly
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-white/80 bg-white/82 text-[#6B6357] hover:bg-white"
              }`}
            aria-pressed={onlineOnly}
          >
            {activeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Activity className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Online now</span>
          </button>
          <div
            className="order-2 inline-flex h-12 items-center rounded-2xl border border-[#D8CFC3] bg-white/78 p-1 shadow-[0_10px_24px_rgba(44,42,40,0.12)] sm:order-none"
            aria-label="User list view"
          >
            <button
              type="button"
              onClick={() => setSelectedViewMode("table")}
              className={`inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl transition-colors ${viewMode === "table"
                ? "bg-[#65432c] text-white shadow-[0_6px_16px_rgba(140,93,62,0.24)]"
                : "text-[#8C6D50] hover:bg-white/55 hover:text-[#2C2A28]"
                }`}
              aria-label="Table view"
              aria-pressed={viewMode === "table"}
              title="Table view"
            >
              <Table2 className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedViewMode("grid")}
              className={`inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl transition-colors ${viewMode === "grid"
                ? "bg-[#8C5D3E] text-white shadow-[0_6px_16px_rgba(140,93,62,0.24)]"
                : "text-[#8C6D50] hover:bg-white/55 hover:text-[#2C2A28]"
                }`}
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              title="Grid view"
            >
              <LayoutGrid className="h-[18px] w-[18px]" />
            </button>
          </div>
          <label className="relative block w-full sm:w-[min(24rem,38vw)]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A09890]" />
            <input
              type="search"
              value={usernameQuery}
              onChange={(e) => {
                setCurrentPage(1);
                setUsernameQuery(e.target.value);
              }}
              placeholder="Search username..."
              aria-label="Search users by username"
              className="h-12 w-full rounded-2xl border border-[#E4DDD3] bg-white/78 pl-11 pr-4 text-sm font-semibold text-[#2C2A28] shadow-[0_8px_26px_rgba(44,42,40,0.06)] outline-none transition-all placeholder:text-[#AFA69A] focus:border-violet-200 focus:bg-white focus:ring-4 focus:ring-violet-100/70"
            />
          </label>
        </div>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="glass rounded-2xl border border-[#E8E2D8] px-6 py-12 text-center shadow-[0_4px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-black text-[#2C2A28]">No users found</p>
          <p className="mt-1 text-xs font-semibold text-[#918B80]">
            {normalizedUsernameQuery
              ? `No username matches @${normalizedUsernameQuery}`
              : onlineOnly
                ? "No users are online right now."
                : "No users are on the platform yet."}
          </p>
        </div>
      ) : (
        <>
          {/* ── MOBILE + DESKTOP: Card / Grid ──────────────── */}
          <div className={`grid gap-5 ${viewMode === "grid" ? "block" : "hidden"} md:hidden`}>
            {paginatedUsers.map(renderUserCard)}
          </div>

          {/* ── DESKTOP: Grid cards ───────────────────────── */}
          {viewMode === "grid" && (
            <div className="hidden gap-5 md:grid md:grid-cols-2 xl:grid-cols-3">
              {paginatedUsers.map(renderUserCard)}
            </div>
          )}

          {/* ── Table view (mobile x-scroll + desktop) ─────── */}
          {viewMode === "table" && (
            <div className="block">
              <div className="glass rounded-2xl border border-[#E8E2D8] shadow-[0_4px_32px_rgba(0,0,0,0.06)]">
                <div className="w-full overflow-x-auto rounded-2xl">
                  <table className="w-full min-w-[640px] md:min-w-[860px] text-[12px]">
                    <thead>
                      <tr className="bg-[#F0EBE2]/80 border-b-2 border-[#E4DDD3]">
                        {["User", "Email", "Role"].map((h) => (
                          <th key={h} className="px-3 py-2.5 text-left text-[9px] font-black uppercase tracking-[0.12em] text-[#8C6D50] whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                        <th className="cursor-pointer px-3 py-2.5 text-left" aria-sort={sortField === "quizzes" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                          {renderSortHeader("quizzes", "Quizzes")}
                        </th>
                        <th className="cursor-pointer px-3 py-2.5 text-left" aria-sort={sortField === "attempts" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                          {renderSortHeader("attempts", "Attempts")}
                        </th>
                        <th className="cursor-pointer px-3 py-2.5 text-left" aria-sort={sortField === "joined" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                          {renderSortHeader("joined", "Joined")}
                        </th>
                        <th className="cursor-pointer px-3 py-2.5 text-left" aria-sort={sortField === "lastOnline" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                          {renderSortHeader("lastOnline", "Last")}
                        </th>
                        <th className="px-3 py-2.5 text-left text-[9px] font-black uppercase tracking-[0.12em] text-[#8C6D50] whitespace-nowrap">Access</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedUsers.map((user, i) => {
                        const { date, time } = formatDate(user.createdAt);
                        const lastOnline = formatLastOnline(user.lastSeenAt);
                        const isYou = user.id === currentUserId;
                        return (
                          <tr
                            key={user.id}
                            className={`
                      group transition-colors duration-150 border-b border-[#EDE8E0] last:border-0
                      ${(pageStartIndex + i) % 2 === 0 ? "bg-white/20" : "bg-[#FAF7F3]/40"}
                      hover:bg-[#F5EDE2]/60
                    `}
                          >
                            {/* User */}
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Avatar name={user.fullName} role={user.role} imageUrl={user.profileImageUrl} />
                                <div>
                                  <p className="font-bold text-[12px] text-[#1E1C1A] leading-snug whitespace-nowrap">{user.fullName}</p>
                                  <p className="text-[10px] font-semibold text-[#A09890]">@{user.username}</p>
                                </div>
                              </div>
                            </td>

                            {/* Email */}
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                <Mail className="w-3 h-3 text-[#C4BAB0] flex-shrink-0" />
                                <span className="text-[11px] font-semibold text-[#3D3A37] whitespace-nowrap">{user.email}</span>
                              </div>
                            </td>

                            {/* Role */}
                            <td className="px-3 py-2 cursor-pointer">
                              {canShowRoleDropdown(user) ? (
                                <RoleDropdown role={user.role} userId={user.id} updating={updating} allowedRoles={allowedRoleOptions} onChange={changeRole} />
                              ) : (
                                <RolePill role={user.role} isYou={isYou} />
                              )}
                            </td>

                            {/* Quizzes */}
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center justify-center bg-sky-50 border border-sky-100 text-sky-700 font-black text-[11px] rounded-lg px-2 py-0.5 min-w-[28px]">
                                {user._count.quizzes}
                              </span>
                            </td>

                            {/* Attempts */}
                            <td className="px-3 py-2">
                              <span className="inline-flex items-center justify-center bg-violet-50 border border-violet-100 text-violet-700 font-black text-[11px] rounded-lg px-2 py-0.5 min-w-[28px]">
                                {user._count.results}
                              </span>
                            </td>

                            {/* Joined */}
                            <td className="px-3 py-2">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-[#3D3A37] whitespace-nowrap">{date}</span>
                                <span className="text-[10px] font-semibold text-[#A09890]">{time}</span>
                              </div>
                            </td>

                            {/* Last Online */}
                            <td className="px-3 py-2">
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-[#3D3A37] whitespace-nowrap">{lastOnline.label}</span>
                                <span className="text-[10px] font-semibold text-[#A09890]">{lastOnline.detail}</span>
                              </div>
                            </td>

                            {/* Access */}
                            <td className="px-3 py-2">
                              {viewerRole === "MOD" ? (
                                <DisabledAccountButton compact />
                              ) : (
                                <Link
                                  href={`/admin/users/${user.id}`}
                                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#D8CFC3] bg-white/70 px-2 py-1.5 text-[11px] font-black text-[#3D3A37] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-white hover:shadow-md whitespace-nowrap"
                                >
                                  <Settings className="w-3 h-3 text-[#8C6D50]" />
                                  Open
                                  <ExternalLink className="w-3 h-3 text-[#A09890]" />
                                </Link>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer legend */}
                <div className="px-5 py-3 bg-[#F0EBE2]/60 border-t border-[#E4DDD3] flex items-center justify-between">
                  <p className="text-[11px] font-bold text-[#A09890] uppercase tracking-widest">
                    {normalizedUsernameQuery
                      ? `${filteredUsers.length} of ${users.length} users shown`
                      : `${users.length} user${users.length !== 1 ? "s" : ""} total`}
                  </p>
                  <div className="flex items-center gap-4 text-[11px] font-bold text-[#6B6357]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-rose-500 to-red-600" />Admin
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600" />Mod
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-sky-500 to-blue-600" />Instructor
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-violet-500 to-purple-600" />Student
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <PaginationControls
            currentPage={page}
            endItem={endItem}
            onNext={goToNextPage}
            onPrevious={goToPreviousPage}
            startItem={startItem}
            totalItems={filteredUsers.length}
            totalPages={totalPages}
          />
        </>
      )}
    </div>
  );
}
