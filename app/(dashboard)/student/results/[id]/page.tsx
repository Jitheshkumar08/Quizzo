import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CheckCircle2, XCircle, MinusCircle, Trophy, Clock, ArrowLeft, RotateCcw, ChevronDown } from "lucide-react";

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
      student: { select: { fullName: true } },
    },
  });

  if (!result || result.studentId !== session.user.id) redirect("/student/results");

  const pct = Math.round((result.score / result.total) * 100);
  const userAnswers = result.userAnswers as Record<string, string>;

  const correct = result.quiz.questions.filter((q) => userAnswers[q.id] === q.correctAnswer).length;
  const incorrect = result.quiz.questions.filter((q) => userAnswers[q.id] && userAnswers[q.id] !== q.correctAnswer).length;
  const unattempted = result.quiz.questions.filter((q) => !userAnswers[q.id]).length;

  const pctColor = pct >= 75 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400";
  const pctBg = pct >= 75 ? "from-green-500/20 to-emerald-500/20 border-green-500/20" : pct >= 50 ? "from-yellow-500/20 to-amber-500/20 border-yellow-500/20" : "from-red-500/20 to-rose-500/20 border-red-500/20";

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
      {/* Back */}
      <Link href="/student/results" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Results
      </Link>

      {/* Score card */}
      <div className={`glass rounded-2xl p-8 border bg-gradient-to-br ${pctBg} text-center space-y-2`}>
        <Trophy className={`w-12 h-12 mx-auto ${pctColor}`} />
        <h1 className="text-2xl font-bold">{result.quiz.title}</h1>
        <div className={`text-6xl font-black ${pctColor}`}>{pct}%</div>
        <p className="text-lg text-muted-foreground">
          You scored <strong className="text-foreground">{result.score}</strong> out of{" "}
          <strong className="text-foreground">{result.total}</strong>
        </p>
        {result.timeTaken && (
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <Clock className="w-4 h-4" /> Time taken: {formatTime(result.timeTaken)}
          </p>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: CheckCircle2, label: "Correct", value: correct, color: "text-green-400 bg-green-400/10 border-green-400/20" },
          { icon: XCircle, label: "Incorrect", value: incorrect, color: "text-red-400 bg-red-400/10 border-red-400/20" },
          { icon: MinusCircle, label: "Unattempted", value: unattempted, color: "text-muted-foreground bg-white/5 border-white/10" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className={`glass rounded-xl p-4 text-center border ${color.split(" ").slice(1).join(" ")}`}>
            <Icon className={`w-6 h-6 mx-auto mb-1 ${color.split(" ")[0]}`} />
            <div className={`text-2xl font-bold ${color.split(" ")[0]}`}>{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href={`/student/quizzes/${result.quizId}`}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium glass glass-hover">
          <RotateCcw className="w-4 h-4" /> Retake Quiz
        </Link>
        <Link href="/student/quizzes"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white"
          style={{ background: "linear-gradient(135deg, hsl(262 80% 65%), hsl(199 89% 48%))" }}>
          Browse More Quizzes
        </Link>
      </div>

      {/* Per-question review */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">Question Review</h2>
        {result.quiz.questions.map((q, i) => {
          const selected = userAnswers[q.id];
          const isCorrect = selected === q.correctAnswer;
          const isUnattempted = !selected;
          const options = q.options as Record<string, string>;

          return (
            <div key={q.id} className={`glass rounded-2xl p-5 space-y-3 border ${
              isCorrect ? "border-green-500/20" : isUnattempted ? "border-white/5" : "border-red-500/20"
            }`}>
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <p className="font-medium flex-1 leading-relaxed">{q.questionText}</p>
                {isCorrect ? (
                  <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                ) : isUnattempted ? (
                  <MinusCircle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                )}
              </div>

              <div className="pl-11 space-y-1.5">
                {(["A", "B", "C", "D"] as const).map((key) => {
                  const isCorrectOption = key === q.correctAnswer;
                  const isSelectedOption = key === selected;
                  let optionStyle = "bg-white/3 border-white/5 text-muted-foreground";
                  if (isCorrectOption) optionStyle = "bg-green-500/15 border-green-500/30 text-green-200";
                  else if (isSelectedOption && !isCorrect) optionStyle = "bg-red-500/15 border-red-500/30 text-red-200";

                  return (
                    <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border ${optionStyle}`}>
                      <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 bg-white/10">{key}</span>
                      <span>{options[key]}</span>
                      {isCorrectOption && <span className="ml-auto text-xs text-green-400">✓ Correct</span>}
                      {isSelectedOption && !isCorrect && <span className="ml-auto text-xs text-red-400">✗ Your answer</span>}
                    </div>
                  );
                })}
              </div>

              {q.explanation && (
                <div className="pl-11 p-3 rounded-xl bg-cyan-500/8 border border-cyan-500/15 text-sm text-cyan-200">
                  <strong className="text-cyan-400">Explanation: </strong>{q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
