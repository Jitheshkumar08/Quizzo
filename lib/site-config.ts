import { prisma } from "@/lib/prisma";
import { DEFAULT_CELEBRATION_SOUND_PATH } from "@/lib/celebration-sounds";

const SITE_CONFIG_ID = "global";

export interface CelebrationRule {
  id: string;
  label: string;
  minScore: number;
  maxScore: number;
  confettiEnabled: boolean;
  soundEnabled: boolean;
  soundPath: string;
}

export interface SiteConfig {
  celebrationSoundEnabled: boolean;
  celebrationSoundPath: string;
  celebrationRules: CelebrationRule[];
}

interface SiteConfigRow {
  celebrationSoundEnabled: boolean;
  celebrationSoundPath: string;
  celebrationRules: unknown;
}

export const DEFAULT_CELEBRATION_RULES: CelebrationRule[] = [
  {
    id: "high-score",
    label: "High score",
    minScore: 75,
    maxScore: 89,
    confettiEnabled: true,
    soundEnabled: false,
    soundPath: DEFAULT_CELEBRATION_SOUND_PATH,
  },
  {
    id: "excellent-score",
    label: "Excellent score",
    minScore: 90,
    maxScore: 100,
    confettiEnabled: true,
    soundEnabled: true,
    soundPath: DEFAULT_CELEBRATION_SOUND_PATH,
  },
];

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  celebrationSoundEnabled: true,
  celebrationSoundPath: DEFAULT_CELEBRATION_SOUND_PATH,
  celebrationRules: DEFAULT_CELEBRATION_RULES,
};

function isValidRule(value: unknown): value is CelebrationRule {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "label" in value &&
    typeof value.label === "string" &&
    "minScore" in value &&
    typeof value.minScore === "number" &&
    Number.isInteger(value.minScore) &&
    "maxScore" in value &&
    typeof value.maxScore === "number" &&
    Number.isInteger(value.maxScore) &&
    "confettiEnabled" in value &&
    typeof value.confettiEnabled === "boolean" &&
    "soundEnabled" in value &&
    typeof value.soundEnabled === "boolean" &&
    "soundPath" in value &&
    typeof value.soundPath === "string"
  );
}

export function normalizeCelebrationRules(value: unknown): CelebrationRule[] {
  if (!Array.isArray(value)) return DEFAULT_CELEBRATION_RULES;

  const rules = value.filter(isValidRule).map((rule) => ({
    ...rule,
    id: rule.id.trim(),
    label: rule.label.trim(),
    minScore: Math.max(0, Math.min(100, rule.minScore)),
    maxScore: Math.max(0, Math.min(100, rule.maxScore)),
    soundPath: rule.soundPath.trim() || DEFAULT_CELEBRATION_SOUND_PATH,
  }));

  return rules.length > 0 ? rules : DEFAULT_CELEBRATION_RULES;
}

export function findCelebrationRuleForScore(rules: CelebrationRule[], scorePercent: number) {
  return rules.find((rule) => scorePercent >= rule.minScore && scorePercent <= rule.maxScore) ?? null;
}

export async function getSiteConfig(): Promise<SiteConfig> {
  try {
    const rows = await prisma.$queryRaw<SiteConfigRow[]>`
      SELECT "celebrationSoundEnabled", "celebrationSoundPath", "celebrationRules"
      FROM "SiteConfig"
      WHERE "id" = ${SITE_CONFIG_ID}
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return DEFAULT_SITE_CONFIG;

    return {
      celebrationSoundEnabled: row.celebrationSoundEnabled,
      celebrationSoundPath: row.celebrationSoundPath,
      celebrationRules: normalizeCelebrationRules(row.celebrationRules),
    };
  } catch (error) {
    console.error("[GET SITE CONFIG ERROR]", error);
    return DEFAULT_SITE_CONFIG;
  }
}

export async function updateSiteConfig({
  celebrationRules,
  celebrationSoundEnabled,
  celebrationSoundPath,
  updatedById,
}: {
  celebrationRules: CelebrationRule[];
  celebrationSoundEnabled: boolean;
  celebrationSoundPath: string;
  updatedById: string;
}): Promise<SiteConfig> {
  const normalizedRules = normalizeCelebrationRules(celebrationRules);
  const rows = await prisma.$queryRaw<SiteConfigRow[]>`
    INSERT INTO "SiteConfig" ("id", "celebrationSoundEnabled", "celebrationSoundPath", "celebrationRules", "updatedAt", "updatedById")
    VALUES (${SITE_CONFIG_ID}, ${celebrationSoundEnabled}, ${celebrationSoundPath}, ${JSON.stringify(normalizedRules)}::jsonb, CURRENT_TIMESTAMP, ${updatedById})
    ON CONFLICT ("id")
    DO UPDATE SET
      "celebrationSoundEnabled" = EXCLUDED."celebrationSoundEnabled",
      "celebrationSoundPath" = EXCLUDED."celebrationSoundPath",
      "celebrationRules" = EXCLUDED."celebrationRules",
      "updatedAt" = CURRENT_TIMESTAMP,
      "updatedById" = EXCLUDED."updatedById"
    RETURNING "celebrationSoundEnabled", "celebrationSoundPath", "celebrationRules"
  `;

  const row = rows[0];
  return row
    ? {
        celebrationSoundEnabled: row.celebrationSoundEnabled,
        celebrationSoundPath: row.celebrationSoundPath,
        celebrationRules: normalizeCelebrationRules(row.celebrationRules),
      }
    : { celebrationRules: normalizedRules, celebrationSoundEnabled, celebrationSoundPath };
}
