import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — list all quizzes (admin sees all, instructor sees own)
export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const where =
      session.user.role === "ADMIN"
        ? {}
        : { createdById: session.user.id };

    const quizzes = await prisma.quiz.findMany({
      where,
      include: {
        createdBy: { select: { fullName: true, username: true } },
        _count: { select: { questions: true, results: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(quizzes);
  } catch (error) {
    console.error("[LIST QUIZZES ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch quizzes" }, { status: 500 });
  }
}

// GET published quizzes for students
export async function HEAD() {
  return NextResponse.json({ ok: true });
}
