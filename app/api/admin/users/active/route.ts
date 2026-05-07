import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getActiveUserIds, isPresenceTemporarilyDisabled } from "@/lib/presence";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (isPresenceTemporarilyDisabled()) {
      return NextResponse.json({ ids: [], presenceEnabled: false });
    }

    const ids = await getActiveUserIds();
    return NextResponse.json({ ids, presenceEnabled: true });
  } catch (error) {
    console.error("[GET ACTIVE USERS ERROR]", error);
    return NextResponse.json({ error: "Failed to fetch active users" }, { status: 500 });
  }
}
