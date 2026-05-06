import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { ACCOUNT_OTP_PURPOSES, verifyAccountOtp } from "@/lib/account-otp";
import { recordUserChangeEvent } from "@/lib/role-change-events";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    const { email, code, newPassword } = await req.json();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const otpCode = String(code ?? "").trim();
    const password = String(newPassword ?? "");
    const purpose = ACCOUNT_OTP_PURPOSES.passwordReset;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (!/^\d{6}$/.test(otpCode)) {
      return NextResponse.json({ error: "Enter the 6-digit reset code." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    }

    const verification = await prisma.accountOtpVerification.findFirst({
      where: { email: normalizedEmail, purpose },
      orderBy: { createdAt: "desc" },
    });

    if (!verification) {
      return NextResponse.json({ error: "Request a new reset code to continue." }, { status: 400 });
    }

    if (verification.expiresAt.getTime() < Date.now()) {
      await prisma.accountOtpVerification.delete({ where: { id: verification.id } });
      return NextResponse.json({ error: "This reset code has expired. Request a new one." }, { status: 400 });
    }

    if (verification.attempts >= MAX_ATTEMPTS) {
      await prisma.accountOtpVerification.delete({ where: { id: verification.id } });
      return NextResponse.json({ error: "Too many incorrect attempts. Request a new code." }, { status: 400 });
    }

    const isValid = verifyAccountOtp(normalizedEmail, purpose, otpCode, verification.codeHash);
    if (!isValid) {
      await prisma.accountOtpVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json({ error: "Incorrect reset code. Please check and try again." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (!user) {
      await prisma.accountOtpVerification.delete({ where: { id: verification.id } });
      return NextResponse.json({ error: "Account not found. Please create an account first." }, { status: 404 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash,
          sessionVersion: { increment: 1 },
        },
      }),
      prisma.accountOtpVerification.deleteMany({
        where: { email: normalizedEmail, purpose },
      }),
    ]);

    await recordUserChangeEvent(prisma, {
      targetUserId: user.id,
      actorId: null,
      action: "user.password.updated",
    });

    return NextResponse.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("[FORGOT PASSWORD VERIFY ERROR]", error);
    return NextResponse.json({ error: "Could not reset your password. Please try again." }, { status: 500 });
  }
}
