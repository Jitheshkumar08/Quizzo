import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CheckCircle2, XCircle, MinusCircle, Trophy, Clock, ArrowLeft, RotateCcw, BookOpen } from "lucide-react";
import ReviewSidebarClientWrapper from "./ReviewSidebarClientWrapper";
import StartReattemptButton from "./StartReattemptButton";
import { parseAnswerMap, parseStringArray } from "@/lib/reattempt-utils";
import { calculateResultReviewStats, parseResultReviewSnapshot } from "@/lib/result-review";
import QuizStartLink from "@/components/quiz/QuizStartLink";
import ConfettiCelebration from "@/components/ui/ConfettiCelebration";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ celebrate?: string }>;
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default async function ResultDetailPage({ params, searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;
  const { celebrate } = await searchParams;

  const result = await prisma.result.findUnique({
    where: { id },
    select: {
      id: true,
      quizId: true,
      studentId: true,
      score: true,
      total: true,
      timeTaken: true,
      userAnswers: true,
      titleOverride: true,
      questionIds: true,
      sourceResultId: true,
      attemptType: true,
      createdAt: true,
      quiz: {
        select: {
          id: true,
          title: true,
          createdById: true,
          shuffleOptions: true,
          questions: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              questionText: true,
              options: true,
              correctAnswer: true,
              explanation: true,
              order: true,
            },
          },
        },
      },
      student: { select: { fullName: true, username: true } },
    },
  });

  if (!result) redirect("/student/results");

  const isStudentOwner = result.studentId === session.user.id;
  const canReviewAsQuizOwner =
    (session.user.role === "INSTRUCTOR" && result.quiz.createdById === session.user.id) ||
    session.user.role === "ADMIN" ||
    session.user.role === "MOD";

  if (!isStudentOwner && !canReviewAsQuizOwner) {
    redirect(session.user.role === "INSTRUCTOR" || session.user.role === "ADMIN" || session.user.role === "MOD" ? "/dashboard" : "/student/results");
  }

  const isInstructorReview = !isStudentOwner && canReviewAsQuizOwner;
  const reviewBackHref =
    isInstructorReview
      ? (session.user.role === "ADMIN" || session.user.role === "MOD" ? "/admin/quizzes" : "/instructor/quizzes")
      : "/student/results";

  const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
  const userAnswers = parseAnswerMap(result.userAnswers);
  const reviewSnapshot = parseResultReviewSnapshot(result.questionIds);
  const coveredQuestionIds = parseStringArray(result.questionIds);
  const coveredQuestionSet = coveredQuestionIds ? new Set(coveredQuestionIds) : null;
  const reviewQuestions = reviewSnapshot?.questions ?? (coveredQuestionSet
    ? result.quiz.questions.filter((q) => coveredQuestionSet.has(q.id))
    : result.quiz.questions);
  const displayTitle = result.titleOverride ?? result.quiz.title;

  const stats = calculateResultReviewStats({
    questions: reviewQuestions,
    userAnswers,
    savedScore: result.score,
    savedTotal: result.total,
  });
  const { correct, incorrect, unattempted } = stats;
  const missedCount = incorrect + unattempted;

  const isReattemptResult = result.attemptType !== "NORMAL" || !!result.sourceResultId;
  const sessionId = isReattemptResult
    ? (await prisma.$queryRaw<{ id: string }[]>`
        SELECT "id"
        FROM "RemedialQuizSession"
        WHERE "resultId" = ${result.id}
        LIMIT 1
      `)[0]?.id ?? null
    : (await prisma.quizSession.findFirst({
        where: {
          quizId: result.quizId,
          studentId: result.studentId,
          submittedAt: {
            gte: new Date(result.createdAt.getTime() - 60000),
            lte: new Date(result.createdAt.getTime() + 60000),
          }
        },
        select: { id: true },
      }))?.id ?? null;

  const pctColor = pct >= 75 ? "text-emerald-500" : pct >= 50 ? "text-amber-500" : "text-rose-500";
  const pctAccent =
    pct >= 75
      ? "from-emerald-400 to-teal-500 border-emerald-200 bg-emerald-50/80"
      : pct >= 50
        ? "from-amber-400 to-orange-500 border-amber-200 bg-amber-50/80"
        : "from-rose-400 to-red-500 border-rose-200 bg-rose-50/80";
  const pctBg =
    pct >= 75
      ? "from-emerald-50 via-white to-teal-50 border-emerald-100"
      : pct >= 50
        ? "from-amber-50 via-white to-orange-50 border-amber-100"
        : "from-rose-50 via-white to-red-50 border-rose-100";

  const showConfetti = celebrate === "1" && pct >= 75;

  return (
    // Pass questions + userAnswers as props so the wrapper can render
    // ReviewQuestionsClient (20/page) separately from the static children.
    <ReviewSidebarClientWrapper
      questions={reviewQuestions}
      userAnswers={userAnswers}
      shuffleOptions={result.quiz.shuffleOptions}
      sessionId={sessionId}
      answerLabel={isInstructorReview ? "Student answer" : "Your answer"}
      statsOverride={stats}
      emptyMessage={stats.isLegacyQuestionMismatch ? "Question-level review is unavailable for this attempt because the quiz questions were replaced after submission. The score summary uses the saved result." : undefined}
    >

      <style>{`
        .result-action-btn-outline {
          font-family: inherit;
          padding: 0.5em 1.1em;
          font-weight: 900;
          font-size: 14px;
          border: 3px solid currentColor;
          border-radius: 0.4em;
          box-shadow: 0.1em 0.1em currentColor;
          cursor: pointer;
          transition: transform 120ms ease, box-shadow 120ms ease, background-color 120ms ease;
        }

        .result-action-btn-outline:hover {
          transform: translate(-0.05em, -0.05em);
          box-shadow: 0.15em 0.15em currentColor;
        }

        .result-action-btn-outline:active {
          transform: translate(0.05em, 0.05em);
          box-shadow: 0.05em 0.05em currentColor;
        }
      `}</style>

      {/* Confetti celebration for 75%+ scores, only on fresh submit */}
      {showConfetti && <ConfettiCelebration />}

      {/* Back */}
      <Link
        href={reviewBackHref}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> {isInstructorReview ? "Back to Quizzes" : "Back to Results"}
      </Link>

      {/* Score card */}
      <div className={`relative overflow-hidden rounded-[24px] p-5 sm:p-7 border bg-gradient-to-br ${pctBg} text-center space-y-3 shadow-[0_14px_42px_rgba(15,23,42,0.07)]`}>
        <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
        <div className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border bg-gradient-to-br ${pctAccent} shadow-[0_10px_25px_rgba(15,23,42,0.1)]`}>
          <Trophy className="w-7 h-7 text-white drop-shadow-sm" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-950 break-words tracking-tight">{displayTitle}</h1>
        {isInstructorReview && (
          <p className="mx-auto inline-flex max-w-full items-center justify-center rounded-full border border-slate-200 bg-white/80 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-slate-600 shadow-sm">
            Reviewing {result.student.fullName}
            {result.student.username ? ` (@${result.student.username})` : ""}
          </p>
        )}
        <div className={`text-5xl sm:text-6xl font-black ${pctColor} tracking-tight leading-none`}>{pct}%</div>
        <p className="text-sm sm:text-lg text-slate-600 font-medium">
          {isInstructorReview ? `${result.student.fullName} scored` : "You scored"}{" "}
          <strong className="text-slate-950 font-black">{result.score}</strong> out of{" "}
          <strong className="text-slate-950 font-black">{result.total}</strong>
        </p>
        {result.timeTaken && (
          <p className="mx-auto inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-white/75 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-500 ring-1 ring-slate-200/70">
            <Clock className="w-3.5 h-3.5 text-slate-400" /> Time taken: {formatTime(result.timeTaken)}
          </p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { icon: CheckCircle2, label: "Correct", value: correct, color: "text-emerald-500", shell: "from-emerald-50 to-white border-emerald-100", iconBg: "bg-emerald-100 ring-emerald-200" },
          { icon: XCircle, label: "Incorrect", value: incorrect, color: "text-rose-500", shell: "from-rose-50 to-white border-rose-100", iconBg: "bg-rose-100 ring-rose-200" },
          { icon: MinusCircle, label: "Unattempted", value: unattempted, color: "text-slate-500", shell: "from-slate-50 to-white border-slate-200", iconBg: "bg-slate-100 ring-slate-200" },
        ].map(({ icon: Icon, label, value, color, shell, iconBg }) => (
          <div key={label} className={`rounded-[22px] p-4 sm:p-5 text-center border bg-gradient-to-br ${shell} flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-3 shadow-[0_10px_28px_rgba(15,23,42,0.055)]`}>
            <div className="flex items-center gap-3 sm:gap-2 sm:flex-col sm:mb-0.5">
              <span className={`flex h-9 w-9 items-center justify-center rounded-2xl ring-1 ${iconBg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </span>
              <div className="text-xs sm:text-sm font-black text-slate-600 sm:order-last sm:mt-1">{label}</div>
            </div>
            <div className={`text-2xl sm:text-3xl font-black ${color} tracking-tight`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      {!isInstructorReview && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center justify-center">
            <QuizStartLink
              quizId={result.quizId}
              className="result-action-btn-outline flex h-[46px] w-full items-center justify-center gap-2 bg-white text-slate-700 hover:bg-slate-50 sm:w-auto"
            >
              <RotateCcw className="w-4 h-4" /> Retake Quiz
            </QuizStartLink>
            <Link
              href="/student/quizzes"
              className="result-action-btn-outline flex h-[46px] w-full items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 sm:w-auto"
            >
              <BookOpen className="w-4 h-4" /> Browse Quizzes
            </Link>
          </div>

          {missedCount > 0 && (
            <StartReattemptButton
              resultId={result.id}
              missedCount={missedCount}
              incorrectCount={incorrect}
              unattemptedCount={unattempted}
            />
          )}
        </div>
      )}

    </ReviewSidebarClientWrapper>
  );
}
