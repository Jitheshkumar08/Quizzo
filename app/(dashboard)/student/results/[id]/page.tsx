import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CheckCircle2, XCircle, MinusCircle, Trophy, Clock, ArrowLeft, RotateCcw } from "lucide-react";
import ReviewSidebarClientWrapper from "./ReviewSidebarClientWrapper";

interface Props {
  params: Promise<{ id: string }>;
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default async function ResultDetailPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { id } = await params;

  const result = await prisma.result.findUnique({
    where: { id },
    include: {
      quiz: {
        include: {
          questions: { orderBy: { order: "asc" } },
        },
      },
      student: { select: { fullName: true, username: true } },
    },
  });

  if (!result) redirect("/student/results");

  const isStudentOwner = result.studentId === session.user.id;
  const canReviewAsQuizOwner =
    (session.user.role === "INSTRUCTOR" && result.quiz.createdById === session.user.id) ||
    session.user.role === "ADMIN";

  if (!isStudentOwner && !canReviewAsQuizOwner) {
    redirect(session.user.role === "INSTRUCTOR" || session.user.role === "ADMIN" ? "/instructor/quizzes" : "/student/results");
  }

  const isInstructorReview = !isStudentOwner && canReviewAsQuizOwner;

  const pct = Math.round((result.score / result.total) * 100);
  const userAnswers = result.userAnswers as Record<string, string>;

  const correct = result.quiz.questions.filter((q) => userAnswers[q.id] === q.correctAnswer).length;
  const incorrect = result.quiz.questions.filter((q) => userAnswers[q.id] && userAnswers[q.id] !== q.correctAnswer).length;
  const unattempted = result.quiz.questions.filter((q) => !userAnswers[q.id]).length;

  const sessionRecord = await prisma.quizSession.findFirst({
    where: {
      quizId: result.quizId,
      studentId: result.studentId,
      submittedAt: {
        gte: new Date(result.createdAt.getTime() - 60000),
        lte: new Date(result.createdAt.getTime() + 60000),
      }
    }
  });
  const sessionId = sessionRecord?.id || null;

  const pctColor = pct >= 75 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400";
  const pctBg =
    pct >= 75
      ? "from-green-500/20 to-emerald-500/20 border-green-500/20"
      : pct >= 50
      ? "from-yellow-500/20 to-amber-500/20 border-yellow-500/20"
      : "from-red-500/20 to-rose-500/20 border-red-500/20";

  return (
    // Pass questions + userAnswers as props so the wrapper can render
    // ReviewQuestionsClient (20/page) separately from the static children.
    <ReviewSidebarClientWrapper 
      questions={result.quiz.questions} 
      userAnswers={userAnswers}
      shuffleOptions={result.quiz.shuffleOptions}
      sessionId={sessionId}
      answerLabel={isInstructorReview ? "Student answer" : "Your answer"}
    >

      {/* Back */}
      <Link
        href={isInstructorReview ? "/instructor/quizzes" : "/student/results"}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> {isInstructorReview ? "Back to Quizzes" : "Back to Results"}
      </Link>

      {/* Score card */}
      <div className={`glass rounded-2xl p-6 sm:p-8 border bg-gradient-to-br ${pctBg} text-center space-y-2`}>
        <Trophy className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto ${pctColor}`} />
        <h1 className="text-xl sm:text-2xl font-bold break-words">{result.quiz.title}</h1>
        {isInstructorReview && (
          <p className="text-sm font-semibold text-muted-foreground">
            Reviewing {result.student.fullName}
            {result.student.username ? ` (@${result.student.username})` : ""}
          </p>
        )}
        <div className={`text-5xl sm:text-6xl font-black ${pctColor}`}>{pct}%</div>
        <p className="text-base sm:text-lg text-muted-foreground">
          {isInstructorReview ? `${result.student.fullName} scored` : "You scored"}{" "}
          <strong className="text-foreground">{result.score}</strong> out of{" "}
          <strong className="text-foreground">{result.total}</strong>
        </p>
        {result.timeTaken && (
          <p className="text-xs sm:text-sm text-muted-foreground flex flex-wrap items-center justify-center gap-1">
            <Clock className="w-4 h-4" /> Time taken: {formatTime(result.timeTaken)}
          </p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { icon: CheckCircle2, label: "Correct", value: correct, color: "text-green-400 bg-green-400/10 border-green-400/20" },
          { icon: XCircle, label: "Incorrect", value: incorrect, color: "text-red-400 bg-red-400/10 border-red-400/20" },
          { icon: MinusCircle, label: "Unattempted", value: unattempted, color: "text-muted-foreground bg-white/5 border-white/10" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className={`glass rounded-xl p-4 sm:p-5 text-center border flex flex-row sm:flex-col items-center justify-between sm:justify-center gap-3 sm:gap-0 ${color.split(" ").slice(1).join(" ")}`}>
            <div className="flex items-center gap-2 sm:gap-0 sm:flex-col sm:mb-1">
              <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${color.split(" ")[0]}`} />
              <div className="text-sm font-semibold sm:text-xs text-muted-foreground sm:order-last sm:mt-1">{label}</div>
            </div>
            <div className={`text-xl sm:text-2xl font-bold ${color.split(" ")[0]}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      {!isInstructorReview && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={`/student/quizzes/${result.quizId}`}
            className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-xl text-sm font-medium glass glass-hover w-full sm:w-auto"
          >
            <RotateCcw className="w-4 h-4" /> Retake Quiz
          </Link>
          <Link
            href="/student/quizzes"
            className="flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-xl text-sm font-semibold text-white w-full sm:w-auto"
            style={{ background: "linear-gradient(135deg, hsl(262 80% 65%), hsl(199 89% 48%))" }}
          >
            Browse More Quizzes
          </Link>
        </div>
      )}

    </ReviewSidebarClientWrapper>
  );
}
