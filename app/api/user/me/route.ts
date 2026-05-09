import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        username: true,
        email: true,
        fullName: true,
        role: true,
        profileImageUrl: true,
        authProvider: true,
        sessionVersion: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      profileImageUrl: user.profileImageUrl,
      authProvider: user.authProvider,
      requiresReauth: user.sessionVersion > Number(session.user.sessionVersion ?? 0),
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
