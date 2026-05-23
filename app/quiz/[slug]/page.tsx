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
      ],
    },
    select: { id: true, title: true },
  });

  if (!quiz) {
    redirect("/student/quizzes");
  }

  if (!session) {
    const callbackUrl = `/quiz/${encodeURIComponent(cleanedSlug)}`;

    return (
      <div className="fixed inset-0 z-0 flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#FCF9F2] p-4">
        <div className="absolute inset-0 bg-[radial-gradient(#E8E3DA_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
        <div className="absolute inset-0 bg-[#1F1B19]/18 backdrop-blur-[2px]" />

        <div className="relative w-full max-w-[430px] overflow-hidden rounded-[34px] border border-white/95 bg-[#FFFDF9] p-7 text-center shadow-[0_34px_110px_rgba(0,0,0,0.30),0_0_0_1px_rgba(31,27,25,0.08)]">
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-100/80 to-transparent" />
          <div className="absolute -right-14 -top-16 h-36 w-36 rounded-full bg-blue-100 blur-3xl" />
          <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] bg-blue-100 text-blue-700 shadow-[0_12px_28px_rgba(37,99,235,0.16)] ring-1 ring-blue-200">
            <BookOpen className="h-8 w-8" />
          </div>
          <div className="relative space-y-2">
            <h1 className="text-2xl font-black tracking-tight text-[#1F1B19]">Sign in to start this quiz</h1>
            <p className="mx-auto max-w-sm text-sm font-semibold leading-relaxed text-[#6B6357]">
              You need to log in or create an account before attempting this quiz.
            </p>
            <p className="mx-auto max-w-sm break-words text-xs font-bold leading-relaxed text-[#918B80]">
              After authentication, you will be returned to <span className="text-[#2C2A28]">{quiz.title}</span>.
            </p>
          </div>
          <div className="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link
              href={authLinkWithCallback("/login", callbackUrl)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] bg-[#1F1B19] px-5 text-sm font-black text-white shadow-[0_14px_30px_rgba(31,27,25,0.24)] transition-colors hover:bg-[#14110F]"
            >
              <LogIn className="h-4 w-4" />
              Log in
            </Link>
            <Link
              href={authLinkWithCallback("/signup", callbackUrl)}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-[18px] border border-[#D8CFC3] bg-white px-5 text-sm font-black text-[#2C2A28] shadow-[0_10px_24px_rgba(44,42,40,0.08)] transition-colors hover:bg-[#F8F3EA]"
            >
              <UserPlus className="h-4 w-4" />
              Sign up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  redirect(`/student/quizzes/${quiz.id}`);
}
