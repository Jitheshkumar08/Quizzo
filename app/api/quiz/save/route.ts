import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

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
  scheduleEnabled: z.boolean().optional(),
  scheduledStart: z.string().optional().nullable(),
  scheduledEnd: z.string().optional().nullable(),
  requireQuizPassword: z.boolean().optional(),
  quizAccessPassword: z.string().optional(),
  allowMultipleAttempts: z.boolean().optional(),
});

type QuestionInput = z.infer<typeof QuestionSchema>;
type SavePayload = z.infer<typeof SaveQuizSchema>;

async function buildAccessUpdateData(
  parsed: SavePayload,
  existingPasswordHash: string | null,
  isCreate: boolean
) {
  const allowMultipleAttempts = parsed.allowMultipleAttempts ?? false;

  let scheduledStart: Date | null = null;
  let scheduledEnd: Date | null = null;
  if (parsed.scheduleEnabled) {
    if (!parsed.scheduledStart || !parsed.scheduledEnd) {
      throw new Error("Start and end times are required when scheduling is enabled");
    }
    scheduledStart = new Date(parsed.scheduledStart);
    scheduledEnd = new Date(parsed.scheduledEnd);
    if (Number.isNaN(scheduledStart.getTime()) || Number.isNaN(scheduledEnd.getTime())) {
      throw new Error("Invalid schedule times");
    }
    if (scheduledEnd <= scheduledStart) {
      throw new Error("End time must be after start time");
    }
  }

  const requirePw = parsed.requireQuizPassword ?? false;
  let accessPasswordHash: string | null = existingPasswordHash;

  if (!requirePw) {
    accessPasswordHash = null;
  } else {
    const plain = parsed.quizAccessPassword?.trim() ?? "";
    if (plain.length > 0) {
      if (plain.length < 4) {
        throw new Error("Quiz password must be at least 4 characters");
      }
      accessPasswordHash = await bcrypt.hash(plain, 10);
    } else if (isCreate) {
      throw new Error("Quiz password is required when access password is enabled");
    } else if (!existingPasswordHash) {
      throw new Error("Quiz password is required when access password is enabled");
    }
  }

  return { scheduledStart, scheduledEnd, accessPasswordHash, allowMultipleAttempts };
}

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
    let accessFields;
    try {
      if (quizId) {
        const existing = await prisma.quiz.findUnique({ where: { id: quizId } });
        if (!existing || (existing.createdById !== session.user.id && session.user.role !== "ADMIN")) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
        accessFields = await buildAccessUpdateData(parsed.data, existing.accessPasswordHash, false);
      } else {
        accessFields = await buildAccessUpdateData(parsed.data, null, true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid access settings";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (quizId) {
      quiz = await prisma.quiz.update({
        where: { id: quizId },
        data: {
          title,
          description,
          jsonBlobUrl,
          isPublished: publish,
          ...accessFields,
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
          ...accessFields,
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

    let accessFields;
    try {
      accessFields = await buildAccessUpdateData(parsed.data, quiz.accessPasswordHash, false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid access settings";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    await prisma.question.deleteMany({ where: { quizId } });

    const updated = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        title,
        description,
        isPublished: publish,
        ...accessFields,
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
