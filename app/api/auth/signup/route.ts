import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { z } from "zod";
import { generateSignupOtp, hashSignupOtp, signupOtpExpiry, signupOtpTtlMinutes } from "@/lib/signup-otp";
import { ResendNotConfiguredError, sendSignupOtpEmail } from "@/lib/resend-email";

const SignupSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name using at least 2 characters."),
  username: z
    .string()
    .trim()
    .min(3, "Choose a username with at least 3 characters.")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = SignupSchema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Validation error";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const { fullName, username, email, password } = parsed.data;
    const normalizedUsername = username.toLowerCase();
    const normalizedEmail = email.toLowerCase();

    await prisma.emailSignupVerification.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    });

    // Check duplicates
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { username: normalizedUsername },
        ],
      },
      select: { email: true },
    });

    if (existing) {
      const field = existing.email === normalizedEmail ? "Email" : "Username";
      return NextResponse.json(
        {
          error:
            field === "Email"
              ? "That email is already registered. Try logging in instead."
              : "That username is already taken. Please choose another one.",
        },
        { status: 409 }
      );
    }

    const pendingUsername = await prisma.emailSignupVerification.findFirst({
      where: {
        username: normalizedUsername,
        email: { not: normalizedEmail },
        expiresAt: { gt: new Date() },
      },
      select: { id: true },
    });

    if (pendingUsername) {
      return NextResponse.json(
        { error: "That username is already being verified. Please choose another one." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const code = generateSignupOtp();
    const codeHash = hashSignupOtp(normalizedEmail, code);
    const expiresAt = signupOtpExpiry();

    await prisma.emailSignupVerification.upsert({
      where: { email: normalizedEmail },
      update: {
        fullName,
        username: normalizedUsername,
        passwordHash,
        codeHash,
        attempts: 0,
        expiresAt,
      },
      create: {
        email: normalizedEmail,
        fullName,
        username: normalizedUsername,
        passwordHash,
        codeHash,
        expiresAt,
      },
    });

    try {
      await sendSignupOtpEmail({ to: normalizedEmail, fullName, code });
    } catch (error) {
      await prisma.emailSignupVerification.delete({ where: { email: normalizedEmail } }).catch(() => null);

      if (error instanceof ResendNotConfiguredError) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      console.error("[SEND SIGNUP OTP ERROR]", error);
      return NextResponse.json(
        { error: "Could not send verification email. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      verificationRequired: true,
      email: normalizedEmail,
      expiresInMinutes: signupOtpTtlMinutes(),
    });
  } catch (error) {
    console.error("[SIGNUP ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
