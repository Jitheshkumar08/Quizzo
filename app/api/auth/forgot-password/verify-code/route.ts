import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ACCOUNT_OTP_PURPOSES, verifyAccountOtp } from "@/lib/account-otp";

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const otpCode = String(code ?? "").trim();
    const purpose = ACCOUNT_OTP_PURPOSES.passwordReset;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (!/^\d{6}$/.test(otpCode)) {
      return NextResponse.json({ error: "Enter the 6-digit reset code." }, { status: 400 });
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FORGOT PASSWORD VERIFY CODE ERROR]", error);
    return NextResponse.json({ error: "Could not verify the reset code. Please try again." }, { status: 500 });
  }
}
