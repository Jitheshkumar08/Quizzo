import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import AdminQuizUsernameSearch from "@/components/admin/AdminQuizUsernameSearch";
import AdminQuizList from "@/components/admin/AdminQuizList";
import QuizListRealtimeRefresh from "@/components/live/QuizListRealtimeRefresh";
import { canAccessAdminControls } from "@/lib/roles";

export const metadata = { title: "All Quizzes - Admin" };

interface AdminQuizzesPageProps {
  searchParams?: Promise<{ username?: string }>;
}

interface NormalResultCountRow {
  quizId: string;
  count: bigint;
}

export default async function AdminQuizzesPage({ searchParams }: AdminQuizzesPageProps) {
  const session = await auth();
  if (!session || !canAccessAdminControls(session.user.role)) redirect("/dashboard");

  const isMod = session.user.role === "MOD";
  const params = searchParams ? await searchParams : {};
  const usernameQuery = typeof params.username === "string" ? params.username.trim() : "";
  const where: Prisma.QuizWhereInput = usernameQuery
    ? {
        createdBy: {
          username: {
            contains: usernameQuery,
            mode: "insensitive",
          },
        },
      }
    : {};

  const quizzes = await prisma.quiz.findMany({
    where,
    include: {
      createdBy: { select: { fullName: true, username: true } },
      _count: { select: { questions: true, results: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const normalResultCounts = await prisma.$queryRaw<NormalResultCountRow[]>`
    SELECT "quizId", COUNT(*) AS "count"
    FROM "Result"
    WHERE COALESCE("attemptType", 'NORMAL') = 'NORMAL'
    GROUP BY "quizId"
  `;
  const normalResultCountByQuiz = new Map(
    normalResultCounts.map((row) => [row.quizId, Number(row.count)])
  );
  const quizItems = quizzes.map((quiz) => ({
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    isPublished: quiz.isPublished,
    createdAt: quiz.createdAt.toISOString(),
    updatedAt: quiz.updatedAt.toISOString(),
    createdBy: quiz.createdBy,
    questionCount: quiz._count.questions,
    normalResultCount: normalResultCountByQuiz.get(quiz.id) ?? 0,
  }));

  return (
    <div className="space-y-6 animate-fade-in-up">
      <QuizListRealtimeRefresh />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">All Quizzes</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {usernameQuery
              ? `${quizzes.length} quiz${quizzes.length !== 1 ? "zes" : ""} matching @${usernameQuery}`
              : `${quizzes.length} total quizzes on platform`}
          </p>
        </div>

        <AdminQuizUsernameSearch initialValue={usernameQuery} />
      </div>

      {quizzes.length === 0 ? (
        <div className="glass rounded-2xl border border-[#E8E2D8] px-6 py-12 text-center shadow-[0_4px_32px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-black text-[#2C2A28]">No quizzes found</p>
          <p className="mt-1 text-xs font-semibold text-[#918B80]">
            {usernameQuery
              ? `No creator username matches @${usernameQuery}`
              : "No quizzes are on the platform yet."}
          </p>
        </div>
      ) : (
        <AdminQuizList quizzes={quizItems} isMod={isMod} />
      )}
    </div>
  );
}
