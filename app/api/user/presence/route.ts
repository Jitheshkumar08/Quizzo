import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isPresenceTemporarilyDisabled, touchUserPresence } from "@/lib/presence";

export async function POST() {
  try {
    if (isPresenceTemporarilyDisabled()) {
      return NextResponse.json({ ok: true, presenceEnabled: false });
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const presenceEnabled = await touchUserPresence(session.user.id);

    return NextResponse.json({ ok: true, presenceEnabled });
  } catch (error) {
    console.error("[PRESENCE HEARTBEAT ERROR]", error);
    return NextResponse.json({ error: "Failed to update presence" }, { status: 500 });
  }
}
