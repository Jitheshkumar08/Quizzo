import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const QuestionSchema = z.object({
  questionText: z.string().min(1),
  options: z.object({
    A: z.string(),
    B: z.string(),
    C: z.string(),
    D: z.string(),
  }),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  explanation: z.string().optional(),
  order: z.number().int(),
});

const SaveQuizSchema = z.object({
  quizId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  jsonBlobUrl: z.string().url().optional(),
  publish: z.boolean().default(false),
  questions: z.array(QuestionSchema),
});

type QuestionInput = z.infer<typeof QuestionSchema>;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = SaveQuizSchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Validation error";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { quizId, title, description, jsonBlobUrl, publish, questions } = parsed.data;

    let quiz;
    
    if (quizId) {
      const existing = await prisma.quiz.findUnique({ where: { id: quizId } });
      if (!existing || (existing.createdById !== session.user.id && session.user.role !== "ADMIN")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      quiz = await prisma.quiz.update({
        where: { id: quizId },
        data: {
          title,
          description,
          jsonBlobUrl,
          isPublished: publish,
          questions: {
            deleteMany: {},
            create: questions.map((q: QuestionInput) => ({
              questionText: q.questionText,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation ?? "",
              order: q.order,
            })),
          },
        },
      });
    } else {
      quiz = await prisma.quiz.create({
        data: {
          title,
          description,
          jsonBlobUrl,
          isPublished: publish,
          createdById: session.user.id,
          questions: {
            create: questions.map((q: QuestionInput) => ({
              questionText: q.questionText,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation ?? "",
              order: q.order,
            })),
          },
        },
      });
    }

    return NextResponse.json({ success: true, quizId: quiz.id });
  } catch (error) {
    console.error("[SAVE QUIZ ERROR]", error);
    return NextResponse.json({ error: "Failed to save quiz" }, { status: 500 });
  }
}

// Update existing quiz (edit + re-publish)
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || (session.user.role !== "INSTRUCTOR" && session.user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { quizId, ...data } = body;

    if (!quizId) {
      return NextResponse.json({ error: "quizId is required" }, { status: 400 });
    }

    // Verify ownership
    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    if (quiz.createdById !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const parsed = SaveQuizSchema.safeParse(data);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Validation error";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { title, description, publish, questions } = parsed.data;

    // Delete existing questions and recreate
    await prisma.question.deleteMany({ where: { quizId } });

    const updated = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        title,
        description,
        isPublished: publish,
        questions: {
          create: questions.map((q: QuestionInput) => ({
            questionText: q.questionText,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation ?? "",
            order: q.order,
          })),
        },
      },
    });

    return NextResponse.json({ quizId: updated.id });
  } catch (error) {
    console.error("[UPDATE QUIZ ERROR]", error);
    return NextResponse.json({ error: "Failed to update quiz" }, { status: 500 });
  }
}
