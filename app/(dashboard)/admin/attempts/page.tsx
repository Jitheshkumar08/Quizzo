import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { canAccessAdminControls } from "@/lib/roles";
import AdminAllAttemptsTable, { type AdminAttemptItem } from "@/components/admin/AdminAllAttemptsTable";

export const metadata = { title: "All Attempts - Admin" };

export default async function AdminAttemptsPage() {
  const session = await auth();
  if (!session || !canAccessAdminControls(session.user.role)) redirect("/dashboard");

  let attempts: AdminAttemptItem[] = [];
  let loadError = false;

  try {
    const results = await prisma.result.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        quizId: true,
        score: true,
        total: true,
        timeTaken: true,
        titleOverride: true,
        attemptType: true,
        createdAt: true,
        quiz: {
          select: {
            title: true,
          },
        },
        student: {
          select: {
            fullName: true,
            username: true,
            profileImageUrl: true,
          },
        },
      },
    });

    attempts = results.map((result) => ({
      id: result.id,
      quizId: result.quizId,
      quizTitle: result.titleOverride ?? result.quiz.title,
      studentName: result.student.fullName,
      username: result.student.username,
      profileImageUrl: result.student.profileImageUrl,
      attemptType: result.attemptType,
      score: result.score,
      totalQuestions: result.total,
      percentage: result.total > 0 ? Math.round((result.score / result.total) * 100) : 0,
      timeTaken: result.timeTaken,
      submittedAt: result.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("Failed to load all attempts", error);
    loadError = true;
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold gradient-text">All Attempts</h1>
          <p className="text-muted-foreground text-sm">
            {attempts.length} quiz attempt{attempts.length !== 1 ? "s" : ""} across all quizzes, sorted by recent by default
          </p>
        </div>
      </div>

      {loadError ? (
        <div className="glass rounded-2xl border border-red-100 bg-red-50/70 px-6 py-12 text-center shadow-[0_4px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-black text-red-700">Could not load attempts</p>
          <p className="mt-1 text-xs font-semibold text-red-500">
            The database connection is currently unavailable. Refresh after the Supabase connection is back online.
          </p>
        </div>
      ) : (
        <AdminAllAttemptsTable attempts={attempts} />
      )}
    </div>
  );
}
