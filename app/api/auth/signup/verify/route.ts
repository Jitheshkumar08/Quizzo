import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifySignupOtp } from "@/lib/signup-otp";
import { z } from "zod";

const VerifySignupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit verification code."),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = VerifySignupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid verification code." },
        { status: 400 }
      );
    }

    const { email, code } = parsed.data;
    const pending = await prisma.emailSignupVerification.findUnique({ where: { email } });

    if (!pending) {
      return NextResponse.json(
        { error: "No verification code found. Please request a new code." },
        { status: 404 }
      );
    }

    if (pending.expiresAt <= new Date()) {
      await prisma.emailSignupVerification.delete({ where: { email } }).catch(() => null);
      return NextResponse.json(
        { error: "That verification code expired. Please request a new code." },
        { status: 410 }
      );
    }

    if (pending.attempts >= 5) {
      await prisma.emailSignupVerification.delete({ where: { email } }).catch(() => null);
      return NextResponse.json(
        { error: "Too many wrong attempts. Please request a new code." },
        { status: 429 }
      );
    }

    if (!verifySignupOtp(email, code, pending.codeHash)) {
      await prisma.emailSignupVerification.update({
        where: { email },
        data: { attempts: { increment: 1 } },
      });
      return NextResponse.json(
        { error: "That code is incorrect. Please check the email and try again." },
        { status: 400 }
      );
    }

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          fullName: pending.fullName,
          username: pending.username,
          email: pending.email,
          passwordHash: pending.passwordHash,
          role: "STUDENT",
          authProvider: "credentials",
          emailVerifiedAt: new Date(),
        },
        select: { id: true, email: true },
      });

      await tx.emailSignupVerification.delete({ where: { email } });
      return created;
    });

    return NextResponse.json({ success: true, email: user.email }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "That email or username was just taken. Please try different details." },
        { status: 409 }
      );
    }

    console.error("[VERIFY SIGNUP ERROR]", error);
    return NextResponse.json({ error: "Could not verify signup right now." }, { status: 500 });
  }
}
