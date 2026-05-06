import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  ACCOUNT_OTP_PURPOSES,
  accountOtpExpiry,
  generateAccountOtp,
  hashAccountOtp,
} from "@/lib/account-otp";
import { ResendNotConfiguredError, sendPasswordResetOtpEmail } from "@/lib/resend-email";

export async function POST(req: Request) {
  try {
    const { identifier, email } = await req.json();
    const rawIdentifier = String(identifier ?? email ?? "").trim();
    const normalizedIdentifier = rawIdentifier.toLowerCase();

    if (!rawIdentifier) {
      return NextResponse.json({ error: "Enter your email address or username." }, { status: 400 });
    }

    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedIdentifier);
    const user = await prisma.user.findFirst({
      where: isEmail
        ? { email: { equals: normalizedIdentifier, mode: "insensitive" } }
        : { username: { equals: rawIdentifier, mode: "insensitive" } },
      select: { id: true, email: true, fullName: true },
    });

    if (!user) {
      return NextResponse.json({ error: "No account found for that email or username." }, { status: 404 });
    }

    const code = generateAccountOtp();
    const purpose = ACCOUNT_OTP_PURPOSES.passwordReset;

    await prisma.accountOtpVerification.deleteMany({
      where: { email: user.email, purpose },
    });

    await prisma.accountOtpVerification.create({
      data: {
        userId: user.id,
        email: user.email,
        purpose,
        codeHash: hashAccountOtp(user.email, purpose, code),
        expiresAt: accountOtpExpiry(),
      },
    });

    await sendPasswordResetOtpEmail({
      to: user.email,
      fullName: user.fullName,
      code,
    });

    return NextResponse.json({
      success: true,
      email: user.email,
      message: `A reset code was sent to ${user.email}.`,
    });
  } catch (error) {
    if (error instanceof ResendNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.error("[FORGOT PASSWORD REQUEST ERROR]", error);
    return NextResponse.json({ error: "Could not send the reset code. Please try again." }, { status: 500 });
  }
}
