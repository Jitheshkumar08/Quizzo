import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcrypt";
import { recordQuizListEvent } from "@/lib/quiz-list-events";
import { buildQuizShareSlugUpdate, generateUniqueQuizShareSlug } from "@/lib/quiz-share-slug";
import { canAccessInstructorArea, canEditInstructorQuiz } from "@/lib/roles";

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
  closed: z.boolean().optional(),
  questions: z.array(QuestionSchema),
  scheduleEnabled: z.boolean().optional(),
  scheduledStart: z.string().optional().nullable(),
  scheduledEnd: z.string().optional().nullable(),
  requireQuizPassword: z.boolean().optional(),
  quizAccessPassword: z.string().optional(),
  allowMultipleAttempts: z.boolean().optional(),
  shuffleQuestions: z.boolean().optional(),
  shuffleOptions: z.boolean().optional(),
  timeLimitEnabled: z.boolean().optional(),
  timeLimitMinutes: z.number().int().min(1).max(1440).optional().nullable(),
});

type QuestionInput = z.infer<typeof QuestionSchema>;
type SavePayload = z.infer<typeof SaveQuizSchema>;

async function getNextDisplayOrder(tx: Prisma.TransactionClient) {
  const maxOrder = await tx.quiz.aggregate({
    where: { isPublished: true },
    _max: { displayOrder: true },
  });

  return (maxOrder._max.displayOrder ?? -1) + 1;
}

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

  const timeLimitEnabled = parsed.timeLimitEnabled ?? false;
  let timeLimitMinutes: number | null = null;
  if (timeLimitEnabled) {
    const m = parsed.timeLimitMinutes;
    if (m == null || m < 1) {
      throw new Error("Set a time limit (minutes) when the per-attempt timer is enabled");
    }
    timeLimitMinutes = m;
  }

  const shuffleQuestions = parsed.shuffleQuestions ?? false;
  const shuffleOptions = parsed.shuffleOptions ?? false;

  return { scheduledStart, scheduledEnd, accessPasswordHash, allowMultipleAttempts, shuffleQuestions, shuffleOptions, timeLimitMinutes };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || !canAccessInstructorArea(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = SaveQuizSchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Validation error";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { quizId, title, description, jsonBlobUrl, publish, questions } = parsed.data;
    const closed = parsed.data.closed ?? false;

    let quiz;
    let accessFields;
    let existingQuiz: { accessPasswordHash: string | null; displayOrder: number | null; shareSlug: string | null } | null = null;
    try {
      if (quizId) {
        if (!canEditInstructorQuiz(session.user.role)) {
          return NextResponse.json({ error: "Moderators cannot edit existing quizzes" }, { status: 403 });
        }
        const existing = await prisma.quiz.findUnique({ where: { id: quizId } });
        if (!existing || (existing.createdById !== session.user.id && session.user.role !== "ADMIN")) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
        existingQuiz = existing;
        accessFields = await buildAccessUpdateData(parsed.data, existing.accessPasswordHash, false);
      } else {
        accessFields = await buildAccessUpdateData(parsed.data, null, true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid access settings";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    if (quizId) {
      quiz = await prisma.$transaction(async (tx) => {
        const nextDisplayOrder =
          publish && existingQuiz?.displayOrder == null
            ? await getNextDisplayOrder(tx)
            : undefined;
        const shareSlugUpdate = await buildQuizShareSlugUpdate(tx, {
          quizId,
          currentSlug: existingQuiz?.shareSlug ?? null,
          title,
        });

        const updated = await tx.quiz.update({
          where: { id: quizId },
          data: {
            title,
            description,
            jsonBlobUrl,
            ...shareSlugUpdate,
            isPublished: publish,
            isClosed: closed,
            ...(typeof nextDisplayOrder === "number" ? { displayOrder: nextDisplayOrder } : {}),
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

        await tx.quizSession.updateMany({
          where: { quizId, submittedAt: null },
          data: { submittedAt: new Date() },
        });

        await recordQuizListEvent(tx, {
          quizId,
          action: closed ? "quiz.updated_closed" : publish ? "quiz.updated_published" : "quiz.updated_draft",
          actorId: session.user.id,
        });

        return updated;
      });
    } else {
      quiz = await prisma.$transaction(async (tx) => {
        const nextDisplayOrder = publish ? await getNextDisplayOrder(tx) : null;
        const created = await tx.quiz.create({
          data: {
            title,
            shareSlug: await generateUniqueQuizShareSlug(tx, title),
            description,
            jsonBlobUrl,
            isPublished: publish,
            isClosed: closed,
            displayOrder: nextDisplayOrder,
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

        await recordQuizListEvent(tx, {
          quizId: created.id,
          action: closed ? "quiz.created_closed" : publish ? "quiz.created_published" : "quiz.created_draft",
          actorId: session.user.id,
        });

        return created;
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
    if (!session || !canEditInstructorQuiz(session.user.role)) {
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
    const closed = parsed.data.closed ?? false;

    let accessFields;
    try {
      accessFields = await buildAccessUpdateData(parsed.data, quiz.accessPasswordHash, false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid access settings";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.question.deleteMany({ where: { quizId } });
      const nextDisplayOrder =
        publish && quiz.displayOrder == null
          ? await getNextDisplayOrder(tx)
          : undefined;

      const shareSlugUpdate = await buildQuizShareSlugUpdate(tx, {
        quizId,
        currentSlug: quiz.shareSlug,
        title,
      });

      const next = await tx.quiz.update({
        where: { id: quizId },
        data: {
          title,
          description,
          ...shareSlugUpdate,
          isPublished: publish,
          isClosed: closed,
          ...(typeof nextDisplayOrder === "number" ? { displayOrder: nextDisplayOrder } : {}),
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

      await tx.quizSession.updateMany({
        where: { quizId, submittedAt: null },
        data: { submittedAt: new Date() },
      });

      await recordQuizListEvent(tx, {
        quizId,
        action: closed ? "quiz.updated_closed" : publish ? "quiz.updated_published" : "quiz.updated_draft",
        actorId: session.user.id,
      });

      return next;
    });

    return NextResponse.json({ quizId: updated.id });
  } catch (error) {
    console.error("[UPDATE QUIZ ERROR]", error);
    return NextResponse.json({ error: "Failed to update quiz" }, { status: 500 });
  }
}
