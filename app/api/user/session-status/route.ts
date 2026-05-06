import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rows = await prisma.$queryRaw<Array<{ sessionVersion: number }>>`
      SELECT "sessionVersion"
      FROM "User"
      WHERE "id" = ${session.user.id}
      LIMIT 1
    `;

    const currentVersion = rows[0]?.sessionVersion ?? 0;
    const tokenVersion = Number(session.user.sessionVersion ?? 0);

    return NextResponse.json({
      requiresReauth: currentVersion > tokenVersion,
    });
  } catch (error) {
    console.error("[SESSION STATUS ERROR]", error);
    return NextResponse.json({ error: "Could not verify session status" }, { status: 500 });
  }
}
