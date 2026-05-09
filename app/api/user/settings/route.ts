import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import bcrypt from "bcrypt";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ACCOUNT_OTP_PURPOSES,
  accountOtpExpiry,
  generateAccountOtp,
  hashAccountOtp,
} from "@/lib/account-otp";
import { recordUserChangeEvent } from "@/lib/role-change-events";
import { ResendNotConfiguredError, sendEmailChangeOtpEmail } from "@/lib/resend-email";

type PendingSettingsPayload = {
  username: string;
  fullName: string;
  email: string;
  passwordHash?: string;
};

function normalizeString(value: unknown) {
  return String(value ?? "").trim();
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role === "MOD") {
      return NextResponse.json({ error: "Moderators cannot change account settings." }, { status: 403 });
    }

    const body = await req.json();
    const username = normalizeString(body.username);
    const fullName = normalizeString(body.fullName);
    const email = normalizeString(body.email).toLowerCase();
    const currentPassword = String(body.currentPassword ?? "");
    const newPassword = String(body.newPassword ?? "");

    if (fullName.length < 2) {
      return NextResponse.json({ error: "Full name must be at least 2 characters." }, { status: 400 });
    }

    if (username.length < 3 || ["admin", "root"].includes(username.toLowerCase())) {
      return NextResponse.json({ error: "Username is not available." }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: "Username can only contain letters, numbers, and underscores." }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let passwordHash: string | undefined;
    const passwordChanged = newPassword.length > 0;

    if (passwordChanged) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required to set a new password." }, { status: 400 });
      }

      if (newPassword.length < 8) {
        return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        return NextResponse.json({ error: "Incorrect current password." }, { status: 400 });
      }

      passwordHash = await bcrypt.hash(newPassword, 12);
    }

    const existingUsername = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" }, id: { not: user.id } },
      select: { id: true },
    });
    if (existingUsername) {
      return NextResponse.json({ error: "Username is already taken." }, { status: 400 });
    }

    const existingEmail = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, id: { not: user.id } },
      select: { id: true },
    });
    if (existingEmail) {
      return NextResponse.json({ error: "Email is already taken." }, { status: 400 });
    }

    const emailChanged = email !== user.email.toLowerCase();
    if (emailChanged) {
      return NextResponse.json({ error: "Email updates are disabled for now." }, { status: 400 });
    }

    const visibleFieldsChanged =
      username !== user.username ||
      fullName !== user.fullName;

    if (!visibleFieldsChanged && !passwordChanged) {
      return NextResponse.json({ error: "No changes provided." }, { status: 400 });
    }

    if (emailChanged) {
      const purpose = ACCOUNT_OTP_PURPOSES.emailChange;
      const code = generateAccountOtp();
      const payload: PendingSettingsPayload = {
        username,
        fullName,
        email,
        ...(passwordHash ? { passwordHash } : {}),
      };

      await prisma.accountOtpVerification.deleteMany({
        where: { userId: user.id, purpose },
      });

      await prisma.accountOtpVerification.create({
        data: {
          userId: user.id,
          email,
          purpose,
          codeHash: hashAccountOtp(`${user.id}:${email}`, purpose, code),
          payload: payload as Prisma.InputJsonObject,
          expiresAt: accountOtpExpiry(),
        },
      });

      await sendEmailChangeOtpEmail({
        to: email,
        fullName,
        code,
      });

      return NextResponse.json({
        success: true,
        emailVerificationRequired: true,
        email,
        message: `A verification code was sent to ${email}.`,
      });
    }

    const updateData: Prisma.UserUpdateInput = {
      username,
      fullName,
    };

    if (passwordHash) {
      updateData.passwordHash = passwordHash;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    if (visibleFieldsChanged || passwordChanged) {
      await recordUserChangeEvent(prisma, {
        targetUserId: user.id,
        actorId: user.id,
        action: passwordChanged ? "user.password.updated" : "user.session-fields.updated",
      });
    }

    return NextResponse.json({ success: true, message: "Profile updated successfully." });
  } catch (error) {
    if (error instanceof ResendNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
