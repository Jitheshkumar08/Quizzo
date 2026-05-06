import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";
import { z } from "zod";

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

    // Check duplicates
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { username: username.toLowerCase() },
        ],
      },
    });

    if (existing) {
      const field = existing.email === email.toLowerCase() ? "Email" : "Username";
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

    const passwordHash = await bcryptjs.hash(password, 12);

    await prisma.user.create({
      data: {
        fullName,
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        passwordHash,
        role: "STUDENT",
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[SIGNUP ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
