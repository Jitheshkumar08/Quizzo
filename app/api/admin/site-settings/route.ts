import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSiteConfig, updateSiteConfig } from "@/lib/site-config";
import { isAdminRole } from "@/lib/roles";

export async function GET() {
  const session = await auth();
  if (!session || !isAdminRole(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await getSiteConfig());
}

export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: unknown = await req.json();
    if (
      typeof body !== "object" ||
      body === null ||
      !("celebrationSoundEnabled" in body) ||
      typeof body.celebrationSoundEnabled !== "boolean"
    ) {
      return NextResponse.json({ error: "Invalid setting value" }, { status: 400 });
    }

    const config = await updateSiteConfig({
      celebrationSoundEnabled: body.celebrationSoundEnabled,
      updatedById: session.user.id,
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("[PATCH SITE SETTINGS ERROR]", error);
    return NextResponse.json({ error: "Failed to update site settings" }, { status: 500 });
  }
}
