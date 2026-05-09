import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordUserChangeEvent } from "@/lib/role-change-events";
import { withDatabaseRetry } from "@/lib/db-retry";

// GET all users (Admin only)
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [users, quizCounts, resultCounts] = await withDatabaseRetry(() =>
      Promise.all([
        prisma.user.findMany({
          select: {
            id: true,
            fullName: true,
            username: true,
            email: true,
            role: true,
            createdAt: true,
            profileImageUrl: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.quiz.groupBy({
          by: ["createdById"],
          _count: { _all: true },
        }),
        prisma.result.groupBy({
          by: ["studentId"],
          _count: { _all: true },
        }),
      ])
    );

    const quizCountByUser = new Map(quizCounts.map((row) => [row.createdById, row._count._all]));
    const resultCountByUser = new Map(resultCounts.map((row) => [row.studentId, row._count._all]));

    return NextResponse.json(
      users.map((user) => ({
        ...user,
        _count: {
          quizzes: quizCountByUser.get(user.id) ?? 0,
          results: resultCountByUser.get(user.id) ?? 0,
        },
      }))
    );
  } catch (error) {
    console.error("[GET USERS ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

// PATCH — change a user's role/profile/password (Admin only)
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, role, fullName, username, email, newPassword } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    const existingUser = await withDatabaseRetry(() =>
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          role: true,
          fullName: true,
          username: true,
          email: true,
        },
      })
    );
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (typeof role !== "undefined") {
      if (!["STUDENT", "INSTRUCTOR", "ADMIN"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }

      // Prevent admins from changing another admin's role
      if (userId !== session.user.id && existingUser.role === "ADMIN" && role !== existingUser.role) {
        return NextResponse.json({ error: "You cannot change another admin's role" }, { status: 400 });
      }

      // Prevent admin from demoting themselves
      if (userId === session.user.id && role !== existingUser.role) {
        return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
      }

      if (role !== existingUser.role) {
        updateData.role = role;
      }
    }

    if (typeof fullName !== "undefined") {
      const nextFullName = String(fullName).trim();
      if (nextFullName.length < 2) {
        return NextResponse.json({ error: "Full name must be at least 2 characters" }, { status: 400 });
      }
      if (nextFullName !== existingUser.fullName) {
        updateData.fullName = nextFullName;
      }
    }

    if (typeof username !== "undefined") {
      const nextUsername = String(username).trim();
      if (nextUsername.length < 3 || ["admin", "root"].includes(nextUsername.toLowerCase())) {
        return NextResponse.json({ error: "Username is not available" }, { status: 400 });
      }

      if (nextUsername !== existingUser.username) {
        const existingUsername = await withDatabaseRetry(() =>
          prisma.user.findFirst({
            where: { username: { equals: nextUsername, mode: "insensitive" }, id: { not: userId } },
            select: { id: true },
          })
        );
        if (existingUsername) {
          return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
        }

        updateData.username = nextUsername;
      }
    }

    if (typeof email !== "undefined") {
      const nextEmail = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
        return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
      }

      if (nextEmail !== existingUser.email) {
        const existingEmail = await withDatabaseRetry(() =>
          prisma.user.findFirst({
            where: { email: { equals: nextEmail, mode: "insensitive" }, id: { not: userId } },
            select: { id: true },
          })
        );
        if (existingEmail) {
          return NextResponse.json({ error: "Email is already taken" }, { status: 400 });
        }

        updateData.email = nextEmail;
      }
    }

    const passwordChanged = typeof newPassword !== "undefined" && String(newPassword).trim().length > 0;

    if (passwordChanged) {
      const password = String(newPassword);
      if (password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      }
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 });
    }

    const sessionProfileFieldsChanged =
      (typeof updateData.fullName !== "undefined" && updateData.fullName !== existingUser.fullName) ||
      (typeof updateData.username !== "undefined" && updateData.username !== existingUser.username) ||
      (typeof updateData.email !== "undefined" && updateData.email !== existingUser.email);

    const updated = await withDatabaseRetry(() =>
      prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: { id: true, fullName: true, username: true, email: true, role: true },
      })
    );

    if (passwordChanged) {
      await withDatabaseRetry(() =>
        prisma.$executeRaw`
          UPDATE "User"
          SET "sessionVersion" = "sessionVersion" + 1
          WHERE "id" = ${userId}
        `
      );
    }

    if (sessionProfileFieldsChanged || passwordChanged) {
      await recordUserChangeEvent(prisma, {
        targetUserId: userId,
        actorId: session.user.id,
        action: passwordChanged ? "user.password.updated" : "user.session-fields.updated",
      });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[UPDATE USER ERROR]", error);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

// DELETE — remove a user and owned/dependent data (Admin only)
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId } = await req.json();
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
    }

    if (userId === session.user.id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await recordUserChangeEvent(tx, {
        targetUserId: userId,
        actorId: session.user.id,
        action: "user.account.deleted",
      });

      const ownedQuizzes = await tx.quiz.findMany({
        where: { createdById: userId },
        select: { id: true },
      });
      const ownedQuizIds = ownedQuizzes.map((quiz) => quiz.id);

      if (ownedQuizIds.length > 0) {
        await tx.quiz.deleteMany({
          where: { id: { in: ownedQuizIds } },
        });
      }

      await tx.quizSession.deleteMany({ where: { studentId: userId } });
      await tx.result.deleteMany({ where: { studentId: userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE USER ERROR]", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
