import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ACCOUNT_OTP_PURPOSES, verifyAccountOtp } from "@/lib/account-otp";
import { recordUserChangeEvent } from "@/lib/role-change-events";

const MAX_ATTEMPTS = 5;

type PendingSettingsPayload = {
  username: string;
  fullName: string;
  email: string;
  passwordHash?: string;
};

function parsePayload(payload: Prisma.JsonValue): PendingSettingsPayload | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const value = payload as Record<string, unknown>;
  const username = typeof value.username === "string" ? value.username.trim() : "";
  const fullName = typeof value.fullName === "string" ? value.fullName.trim() : "";
  const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const passwordHash = typeof value.passwordHash === "string" ? value.passwordHash : undefined;

  if (!username || !fullName || !email) {
    return null;
  }

  return { username, fullName, email, ...(passwordHash ? { passwordHash } : {}) };
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role === "MOD") {
      return NextResponse.json({ error: "Moderators cannot change account settings." }, { status: 403 });
    }

    const { email, code } = await req.json();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const otpCode = String(code ?? "").trim();
    const purpose = ACCOUNT_OTP_PURPOSES.emailChange;

    if (!/^\d{6}$/.test(otpCode)) {
      return NextResponse.json({ error: "Enter the 6-digit verification code." }, { status: 400 });
    }

    const verification = await prisma.accountOtpVerification.findFirst({
      where: {
        userId: session.user.id,
        email: normalizedEmail,
        purpose,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!verification) {
      return NextResponse.json({ error: "Request a new email verification code to continue." }, { status: 400 });
    }

    if (verification.expiresAt.getTime() < Date.now()) {
      await prisma.accountOtpVerification.delete({ where: { id: verification.id } });
      return NextResponse.json({ error: "This verification code has expired. Request a new one." }, { status: 400 });
    }

    if (verification.attempts >= MAX_ATTEMPTS) {
      await prisma.accountOtpVerification.delete({ where: { id: verification.id } });
      return NextResponse.json({ error: "Too many incorrect attempts. Request a new code." }, { status: 400 });
    }

    const isValid = verifyAccountOtp(`${session.user.id}:${normalizedEmail}`, purpose, otpCode, verification.codeHash);
    if (!isValid) {
      await prisma.accountOtpVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json({ error: "Incorrect verification code. Please check and try again." }, { status: 400 });
    }

    const payload = parsePayload(verification.payload);
    if (!payload || payload.email !== normalizedEmail) {
      await prisma.accountOtpVerification.delete({ where: { id: verification.id } });
      return NextResponse.json({ error: "This verification request is invalid. Start again." }, { status: 400 });
    }

    const [existingUsername, existingEmail] = await Promise.all([
      prisma.user.findFirst({
        where: { username: { equals: payload.username, mode: "insensitive" }, id: { not: session.user.id } },
        select: { id: true },
      }),
      prisma.user.findFirst({
        where: { email: { equals: payload.email, mode: "insensitive" }, id: { not: session.user.id } },
        select: { id: true },
      }),
    ]);

    if (existingUsername) {
      return NextResponse.json({ error: "Username is already taken." }, { status: 400 });
    }

    if (existingEmail) {
      return NextResponse.json({ error: "Email is already taken." }, { status: 400 });
    }

    const updateData: Prisma.UserUpdateInput = {
      username: payload.username,
      fullName: payload.fullName,
      email: payload.email,
      emailVerifiedAt: new Date(),
    };

    if (payload.passwordHash) {
      updateData.passwordHash = payload.passwordHash;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.user.update({
        where: { id: session.user.id },
        data: updateData,
        select: {
          username: true,
          fullName: true,
          email: true,
          role: true,
          profileImageUrl: true,
          authProvider: true,
        },
      });

      await tx.accountOtpVerification.deleteMany({
        where: { userId: session.user.id, purpose },
      });

      await recordUserChangeEvent(tx, {
        targetUserId: session.user.id,
        actorId: session.user.id,
        action: "user.session-fields.updated",
      });

      return next;
    });

    return NextResponse.json({
      success: true,
      message: "Email verified and profile updated successfully.",
      user: updated,
    });
  } catch (error) {
    console.error("[EMAIL CHANGE VERIFY ERROR]", error);
    return NextResponse.json({ error: "Could not verify your email. Please try again." }, { status: 500 });
  }
}
