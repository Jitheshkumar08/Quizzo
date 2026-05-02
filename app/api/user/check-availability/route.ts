import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { field, value } = await req.json();

    if (!field || !value) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    let exists = null;
    if (field === "username") {
      exists = await prisma.user.findFirst({
        where: {
          username: { equals: value, mode: "insensitive" },
          id: { not: session.user.id },
        },
      });
    } else if (field === "email") {
      exists = await prisma.user.findFirst({
        where: {
          email: { equals: value, mode: "insensitive" },
          id: { not: session.user.id },
        },
      });
    } else {
      return NextResponse.json({ error: "Invalid field" }, { status: 400 });
    }

    return NextResponse.json({ available: !exists });
  } catch (error) {
    console.error("Availability check error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}