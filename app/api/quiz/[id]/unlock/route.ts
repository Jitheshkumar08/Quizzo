import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { quizAccessCookieName, signQuizAccess } from "@/lib/quiz-access-cookie";
import { getStudentQuizBlock } from "@/lib/quiz-guard-student";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: quizId } = await context.params;
    const body = await req.json();
    const password = typeof body.password === "string" ? body.password : "";

    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId, isPublished: true },
      select: {
        id: true,
        accessPasswordHash: true,
        scheduledStart: true,
        scheduledEnd: true,
        allowMultipleAttempts: true,
      },
    });

    if (!quiz) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    if (!quiz.accessPasswordHash) {
      return NextResponse.json({ error: "This quiz does not require a password" }, { status: 400 });
    }

    const block = await getStudentQuizBlock(req, quiz, session);
    if (block && block.code !== "PASSWORD_REQUIRED") {
      const messages: Record<string, string> = {
        NOT_STARTED: "This quiz is not available yet.",
        ENDED: "This quiz has ended.",
        MAX_ATTEMPTS: "You have already completed this quiz.",
      };
      return NextResponse.json(
        { error: messages[block.code] ?? "Cannot access quiz", code: block.code },
        { status: 403 }
      );
    }

    const ok = await bcrypt.compare(password, quiz.accessPasswordHash);
    if (!ok) {
      return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    }

    const token = signQuizAccess(quizId, session.user.id);
    const res = NextResponse.json({ success: true });
    res.cookies.set(quizAccessCookieName(quizId), token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (error) {
    console.error("[UNLOCK QUIZ ERROR]", error);
    return NextResponse.json({ error: "Failed to unlock quiz" }, { status: 500 });
  }
}
