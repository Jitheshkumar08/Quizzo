import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getSiteConfig, normalizeCelebrationRules, updateSiteConfig, type CelebrationRule } from "@/lib/site-config";
import { isAdminRole } from "@/lib/roles";
import { isValidCelebrationSoundPath } from "@/lib/celebration-sounds";

function getRuleValidationError(rules: CelebrationRule[]) {
  if (rules.length === 0) return "Add at least one celebration rule";
  if (rules.length > 12) return "Use 12 celebration rules or fewer";

  const seenIds = new Set<string>();
  const orderedRules = [...rules].sort((a, b) => a.minScore - b.minScore);

  for (const rule of orderedRules) {
    if (!rule.id || rule.id.length > 80 || seenIds.has(rule.id)) {
      return "Each celebration rule needs a unique id";
    }
    seenIds.add(rule.id);

    if (!rule.label || rule.label.length > 40) {
      return "Each celebration rule needs a short label";
    }
    if (rule.minScore < 0 || rule.maxScore > 100 || rule.minScore > rule.maxScore) {
      return "Score ranges must stay between 0 and 100";
    }
  }

  for (let index = 1; index < orderedRules.length; index += 1) {
    if (orderedRules[index].minScore <= orderedRules[index - 1].maxScore) {
      return "Score ranges cannot overlap";
    }
  }

  return null;
}

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
    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Invalid setting value" }, { status: 400 });
    }

    const currentConfig = await getSiteConfig();
    const celebrationSoundEnabled =
      "celebrationSoundEnabled" in body && typeof body.celebrationSoundEnabled === "boolean"
        ? body.celebrationSoundEnabled
        : currentConfig.celebrationSoundEnabled;
    const celebrationSoundPath =
      "celebrationSoundPath" in body && typeof body.celebrationSoundPath === "string"
        ? body.celebrationSoundPath
        : currentConfig.celebrationSoundPath;
    const celebrationRules =
      "celebrationRules" in body
        ? normalizeCelebrationRules(body.celebrationRules)
        : currentConfig.celebrationRules;

    if (!(await isValidCelebrationSoundPath(celebrationSoundPath))) {
      return NextResponse.json({ error: "Invalid celebration sound file" }, { status: 400 });
    }

    const ruleError = getRuleValidationError(celebrationRules);
    if (ruleError) {
      return NextResponse.json({ error: ruleError }, { status: 400 });
    }

    for (const rule of celebrationRules) {
      if (!(await isValidCelebrationSoundPath(rule.soundPath))) {
        return NextResponse.json({ error: `Invalid sound file for ${rule.label}` }, { status: 400 });
      }
    }

    const config = await updateSiteConfig({
      celebrationRules,
      celebrationSoundEnabled,
      celebrationSoundPath,
      updatedById: session.user.id,
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error("[PATCH SITE SETTINGS ERROR]", error);
    return NextResponse.json({ error: "Failed to update site settings" }, { status: 500 });
  }
}
