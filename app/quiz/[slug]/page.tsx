import Link from "next/link";
import { BookOpen, LogIn, UserPlus } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { authLinkWithCallback } from "@/lib/auth-callback";
import { prisma } from "@/lib/prisma";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function QuizShareRedirectPage({ params }: Props) {
  const session = await auth();
  const { slug } = await params;
  const cleanedSlug = decodeURIComponent(slug || "").trim();

  if (!cleanedSlug) {
    redirect("/student/quizzes");
  }

  const quiz = await prisma.quiz.findFirst({
    where: {
      isPublished: true,
      OR: [
        { shareSlug: cleanedSlug },
        { id: cleanedSlug },
        { shareAliases: { some: { slug: cleanedSlug } } },
      ],
    },
    select: { id: true, title: true, shareSlug: true },
  });

  if (!quiz) {
    redirect("/student/quizzes");
  }

  if (!session) {
    const canonicalSlug = quiz.shareSlug ?? cleanedSlug;
    const callbackUrl = `/quiz/${encodeURIComponent(canonicalSlug)}`;

    return (
      <div className="relative flex min-h-[100dvh] w-full items-center justify-center bg-[#FCF9F2] p-4">
        <div className="absolute inset-0 bg-[radial-gradient(#E8E3DA_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
        <div className="absolute inset-0 bg-[#1F1B19]/25 backdrop-blur-[3px]" />

        <div className="relative w-full max-w-[420px] overflow-hidden rounded-[32px] bg-[#FFFDF9] p-8 sm:p-10 text-center shadow-[0_34px_80px_rgba(0,0,0,0.2),0_0_0_1px_rgba(31,27,25,0.05)]">
          <div className="relative mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#dfceff]/50 text-[#6a32db] border border-[#dfceff]/80">
            <BookOpen className="h-7 w-7" />
          </div>
          
          <div className="relative z-10 flex flex-col items-center">
            <h1 className="text-[20px] sm:text-[22px] font-black tracking-tight text-[#1F1B19] mb-2.5">
              Sign in to start this quiz
            </h1>
            <p className="max-w-[320px] text-[14px] font-semibold leading-relaxed text-[#6B6357] mb-6">
              You need to log in or create a free account before attempting this quiz.
            </p>
            <div className="flex flex-col items-center gap-2 w-full">
              <p className="text-[12px] font-semibold text-[#918B80]">
                After authentication, you will be returned to:
              </p>
              <div className="flex w-full max-w-[320px] items-center justify-center rounded-xl bg-[#F8F3EA]/80 px-4 py-2.5 border border-[#E8E3DA]">
                <span className="text-[14px] font-black text-[#1F1B19] break-words [overflow-wrap:anywhere] text-center leading-snug">
                  {quiz.title}
                </span>
              </div>
            </div>
          </div>

          <div className="relative mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 z-10">
            <Link
              href={authLinkWithCallback("/login", callbackUrl)}
              className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl bg-[#1F1B19] px-4 text-[14px] font-bold text-white transition-all hover:bg-[#14110F] hover:shadow-[0_8px_20px_rgba(31,27,25,0.15)] active:scale-[0.98]"
            >
              <LogIn className="h-[18px] w-[18px]" />
              Log in
            </Link>
            <Link
              href={authLinkWithCallback("/signup", callbackUrl)}
              className="inline-flex h-[46px] items-center justify-center gap-2 rounded-xl border border-[#D8CFC3] bg-white px-4 text-[14px] font-bold text-[#2C2A28] transition-all hover:bg-[#F8F3EA] shadow-sm active:scale-[0.98]"
            >
              <UserPlus className="h-[18px] w-[18px]" />
              Sign up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  redirect(`/student/quizzes/${quiz.id}`);
}
