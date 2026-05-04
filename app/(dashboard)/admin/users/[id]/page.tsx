import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BarChart3, BookOpen, Calendar, Shield, UserCircle2 } from "lucide-react";
import AdminUserAccountForm from "@/components/admin/AdminUserAccountForm";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDate(iso: Date | string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
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

export default async function AdminUserProfilePage({ params }: Props) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard");

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      _count: { select: { quizzes: true, results: true } },
    },
  });

  if (!user) redirect("/admin/users");

  const joined = formatDate(user.createdAt);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm font-bold text-[#6B6357] hover:text-[#2C2A28] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Users
      </Link>

      <div className="rounded-[28px] border border-[#E8E2D8] bg-white/70 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="p-6 sm:p-8 bg-gradient-to-br from-[#FFFDF9] via-white to-[#F4EFE6] border-b border-[#E8E2D8]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-violet-100 to-sky-100 ring-1 ring-white flex items-center justify-center shadow-sm">
                <span className="text-2xl font-black text-violet-700">{user.fullName.charAt(0).toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1E1C1A] tracking-tight truncate">{user.fullName}</h1>
                <p className="text-sm font-medium text-[#918B80]">@{user.username}</p>
              </div>
            </div>

            <span className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r px-4 py-2 text-xs font-bold tracking-wide shadow-sm ${roleStyles[user.role]}`}>
              <Shield className="w-4 h-4" />
              {roleLabels[user.role]}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-5 p-5 sm:p-6">
          <AdminUserAccountForm user={user} currentUserId={session.user.id} />

          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-[24px] border border-sky-100 bg-sky-50/70 p-5 shadow-sm">
              <BookOpen className="w-6 h-6 text-sky-600 mb-3" />
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-700/60">Quizzes</p>
              <p className="text-3xl font-bold text-sky-700">{user._count.quizzes}</p>
            </div>
            <div className="rounded-[24px] border border-violet-100 bg-violet-50/70 p-5 shadow-sm">
              <BarChart3 className="w-6 h-6 text-violet-600 mb-3" />
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700/60">Attempts</p>
              <p className="text-3xl font-bold text-violet-700">{user._count.results}</p>
            </div>
            <div className="rounded-[24px] border border-[#E8E2D8] bg-white/75 p-5 shadow-sm">
              <Calendar className="w-6 h-6 text-[#8C6D50] mb-3" />
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#A09890]">Joined</p>
              <p className="text-sm font-bold text-[#2C2A28]">{joined.date}</p>
              <p className="text-xs font-medium text-[#A09890]">{joined.time}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-[#E8E2D8] bg-[#F4EFE6]/70 p-5 flex items-start gap-3">
        <UserCircle2 className="w-5 h-5 text-[#8C6D50] mt-0.5 flex-shrink-0" />
        <p className="text-sm font-semibold text-[#6B6357]">
          This admin view gives direct access to update the user&apos;s profile, role, email, and password.
        </p>
      </div>
    </div>
  );
}
