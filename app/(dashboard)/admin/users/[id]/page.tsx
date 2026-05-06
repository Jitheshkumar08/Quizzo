import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BarChart3, BookOpen, Calendar, Clock3, Shield, UserCircle2 } from "lucide-react";
import AdminUserAccountForm from "@/components/admin/AdminUserAccountForm";
import DeleteUserButton from "@/components/admin/DeleteUserButton";
import { formatAppDate, formatAppTime } from "@/lib/timezone";
import type { Role } from "@prisma/client";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDate(iso: Date | string) {
  const date = formatAppDate(iso);
  const time = formatAppTime(iso);
  return { date, time };
}

const roleStyles = {
  ADMIN: "from-rose-500 to-red-600 text-white shadow-rose-200",
  INSTRUCTOR: "from-sky-500 to-blue-600 text-white shadow-sky-200",
  STUDENT: "from-violet-500 to-purple-600 text-white shadow-violet-200",
} as const;

const roleLabels = {
  ADMIN: "Admin",
  INSTRUCTOR: "Instructor",
  STUDENT: "Student",
} as const;

interface AdminUserDetail {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: Role;
  lastLoginAt: Date | null;
  createdAt: Date;
  profileImageUrl: string | null;
  quizCount: bigint | number;
  resultCount: bigint | number;
}

export default async function AdminUserProfilePage({ params }: Props) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const users = await prisma.$queryRaw<AdminUserDetail[]>`
    SELECT
      u."id",
      u."fullName",
      u."username",
      u."email",
      u."role",
      u."lastLoginAt",
      u."createdAt",
      u."profileImageUrl",
      COUNT(DISTINCT q."id") AS "quizCount",
      COUNT(DISTINCT r."id") AS "resultCount"
    FROM "User" u
    LEFT JOIN "Quiz" q ON q."createdById" = u."id"
    LEFT JOIN "Result" r ON r."studentId" = u."id"
    WHERE u."id" = ${id}
    GROUP BY u."id"
    LIMIT 1
  `;
  const user = users[0] ?? null;

  if (!user) redirect("/admin/users");

  const joined = formatDate(user.createdAt);
  const lastLogin = user.lastLoginAt ? formatDate(user.lastLoginAt) : null;
  const quizCount = Number(user.quizCount);
  const resultCount = Number(user.resultCount);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm font-bold text-[#6B6357] hover:text-[#2C2A28] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Users
      </Link>

      <div className="rounded-[24px] border border-[#E8E2D8] bg-white/70 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.055)] overflow-hidden">
        <div className="p-4 sm:p-5 bg-gradient-to-br from-[#FFFDF9] via-white to-[#F4EFE6] border-b border-[#E8E2D8]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-violet-100 to-sky-100 ring-2 ring-[#EEE6DA] border border-white/90 flex items-center justify-center shadow-[0_8px_18px_rgba(44,42,40,0.16)] overflow-hidden">
                {user.profileImageUrl ? (
                  <>
                    <span aria-hidden="true" className="absolute inset-0 bg-[#F6F1E8]" />
                    <span
                      aria-hidden="true"
                      className="relative h-full w-full bg-cover bg-center"
                      style={{ backgroundImage: `url("${user.profileImageUrl}")` }}
                    />
                  </>
                ) : (
                  <span className="text-xl font-bold text-violet-700">{user.fullName.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-[#1E1C1A] tracking-tight truncate">{user.fullName}</h1>
                <p className="text-xs sm:text-sm font-medium text-[#918B80]">@{user.username}</p>
              </div>
            </div>

            <div className="flex w-fit flex-wrap items-center gap-2 sm:justify-end">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#E8E2D8] bg-white/75 px-3 py-1.5 text-xs font-bold text-[#6B6357] shadow-sm">
                <Clock3 className="w-3.5 h-3.5 text-[#8C6D50]" />
                <span className="text-[#A09890]">Last login</span>
                <span className="text-[#2C2A28]">
                  {lastLogin ? `${lastLogin.date} ${lastLogin.time}` : "Never"}
                </span>
              </span>
              <span className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r px-3 py-1.5 text-xs font-bold tracking-wide shadow-sm ${roleStyles[user.role]}`}>
                <Shield className="w-3.5 h-3.5" />
                {roleLabels[user.role]}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_260px] gap-4 p-4 sm:p-5">
          <AdminUserAccountForm
            user={{
              id: user.id,
              fullName: user.fullName,
              username: user.username,
              email: user.email,
              role: user.role,
            }}
            currentUserId={session.user.id}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-3">
            <div className="rounded-[20px] border border-sky-100 bg-sky-50/70 p-4 shadow-sm">
              <BookOpen className="w-5 h-5 text-sky-600 mb-2" />
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700/60">Quizzes</p>
              <p className="text-2xl font-bold text-sky-700">{quizCount}</p>
            </div>
            <div className="rounded-[20px] border border-violet-100 bg-violet-50/70 p-4 shadow-sm">
              <BarChart3 className="w-5 h-5 text-violet-600 mb-2" />
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700/60">Attempts</p>
              <p className="text-2xl font-bold text-violet-700">{resultCount}</p>
            </div>
            <div className="rounded-[20px] border border-[#E8E2D8] bg-white/75 p-4 shadow-sm">
              <Calendar className="w-5 h-5 text-[#8C6D50] mb-2" />
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A09890]">Joined</p>
              <p className="text-sm font-bold text-[#2C2A28] leading-tight">{joined.date}</p>
              <p className="text-xs font-medium text-[#A09890]">{joined.time}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[18px] border border-[#E8E2D8] bg-[#F4EFE6]/70 p-3.5 flex items-start gap-3">
        <UserCircle2 className="w-4 h-4 text-[#8C6D50] mt-0.5 flex-shrink-0" />
        <p className="text-xs sm:text-sm font-medium text-[#6B6357]">
          This admin view gives direct access to update the user&apos;s profile, role, email, and password.
        </p>
      </div>

      <DeleteUserButton
        userId={user.id}
        userName={user.fullName}
        isSelf={user.id === session.user.id}
      />
    </div>
  );
}
