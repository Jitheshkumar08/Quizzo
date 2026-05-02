import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcryptjs from "bcryptjs";

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { username, fullName, email, currentPassword, newPassword } = body;

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: any = {
      username,
      fullName,
      email,
    };

    if (currentPassword && newPassword) {
      const isPasswordValid = await bcryptjs.compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        return NextResponse.json({ error: "Incorrect current password" }, { status: 400 });
      }
      updateData.passwordHash = await bcryptjs.hash(newPassword, 10);
    } else if (newPassword && !currentPassword) {
      return NextResponse.json({ error: "Current password is required to set a new password." }, { status: 400 });
    }

    const existingUsername = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" }, id: { not: user.id } },
    });
    if (existingUsername) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
    }

    const existingEmail = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" }, id: { not: user.id } },
    });
    if (existingEmail) {
      return NextResponse.json({ error: "Email is already taken" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, message: "Profile updated successfully" });
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}