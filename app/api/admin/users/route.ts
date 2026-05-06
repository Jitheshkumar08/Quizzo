import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcryptjs from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordUserChangeEvent } from "@/lib/role-change-events";

// GET all users (Admin only)
export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { quizzes: true, results: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
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

    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (typeof role !== "undefined") {
      if (!["STUDENT", "INSTRUCTOR", "ADMIN"].includes(role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }

      // Prevent admin from demoting themselves
      if (userId === session.user.id && role !== existingUser.role) {
        return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
      }

      updateData.role = role;
    }

    if (typeof fullName !== "undefined") {
      const nextFullName = String(fullName).trim();
      if (nextFullName.length < 2) {
        return NextResponse.json({ error: "Full name must be at least 2 characters" }, { status: 400 });
      }
      updateData.fullName = nextFullName;
    }

    if (typeof username !== "undefined") {
      const nextUsername = String(username).trim();
      if (nextUsername.length < 3 || ["admin", "root"].includes(nextUsername.toLowerCase())) {
        return NextResponse.json({ error: "Username is not available" }, { status: 400 });
      }

      const existingUsername = await prisma.user.findFirst({
        where: { username: { equals: nextUsername, mode: "insensitive" }, id: { not: userId } },
      });
      if (existingUsername) {
        return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
      }

      updateData.username = nextUsername;
    }

    if (typeof email !== "undefined") {
      const nextEmail = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
        return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
      }

      const existingEmail = await prisma.user.findFirst({
        where: { email: { equals: nextEmail, mode: "insensitive" }, id: { not: userId } },
      });
      if (existingEmail) {
        return NextResponse.json({ error: "Email is already taken" }, { status: 400 });
      }

      updateData.email = nextEmail;
    }

    const passwordChanged = typeof newPassword !== "undefined" && String(newPassword).trim().length > 0;

    if (passwordChanged) {
      const password = String(newPassword);
      if (password.length < 8) {
        return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
      }
      updateData.passwordHash = await bcryptjs.hash(password, 12);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 });
    }

    const sessionVisibleFieldsChanged =
      (typeof updateData.role !== "undefined" && updateData.role !== existingUser.role) ||
      (typeof updateData.fullName !== "undefined" && updateData.fullName !== existingUser.fullName) ||
      (typeof updateData.username !== "undefined" && updateData.username !== existingUser.username) ||
      (typeof updateData.email !== "undefined" && updateData.email !== existingUser.email);

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.user.update({
        where: { id: userId },
        data: updateData,
        select: { id: true, fullName: true, username: true, email: true, role: true },
      });

      if (passwordChanged) {
        await tx.$executeRaw`
          UPDATE "User"
          SET "sessionVersion" = "sessionVersion" + 1
          WHERE "id" = ${userId}
        `;
      }

      if (sessionVisibleFieldsChanged || passwordChanged) {
        await recordUserChangeEvent(tx, {
          targetUserId: userId,
          actorId: session.user.id,
          action: passwordChanged ? "user.password.updated" : "user.session-fields.updated",
        });
      }

      return next;
    });

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
