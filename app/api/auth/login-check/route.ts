import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { findUserByIdentifier } from "@/lib/user-lookup";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const identifier = typeof body.identifier === "string" ? body.identifier.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!identifier) {
      return NextResponse.json(
        { error: "Enter your email address or username." },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "Enter your password." },
        { status: 400 }
      );
    }

    const user = await findUserByIdentifier(identifier);

    if (!user) {
      return NextResponse.json(
        { error: "No account found for that email or username." },
        { status: 404 }
      );
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      if (user.authProvider === "google") {
        return NextResponse.json(
          { error: "This account was created with Google. Use the recommended Google button to continue." },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: "Password is incorrect. Please try again." },
        { status: 401 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[LOGIN CHECK ERROR]", error);
    return NextResponse.json(
      { error: "Could not verify your login right now. Please try again." },
      { status: 500 }
    );
  }
}
