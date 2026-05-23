import { prisma } from "@/lib/prisma";
import { DEFAULT_CELEBRATION_SOUND_PATH } from "@/lib/celebration-sounds";

const SITE_CONFIG_ID = "global";

export interface SiteConfig {
  celebrationSoundEnabled: boolean;
  celebrationSoundPath: string;
}

interface SiteConfigRow {
  celebrationSoundEnabled: boolean;
  celebrationSoundPath: string;
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  celebrationSoundEnabled: true,
  celebrationSoundPath: DEFAULT_CELEBRATION_SOUND_PATH,
};

export async function getSiteConfig(): Promise<SiteConfig> {
  try {
    const rows = await prisma.$queryRaw<SiteConfigRow[]>`
      SELECT "celebrationSoundEnabled", "celebrationSoundPath"
      FROM "SiteConfig"
      WHERE "id" = ${SITE_CONFIG_ID}
      LIMIT 1
    `;

    return rows[0] ?? DEFAULT_SITE_CONFIG;
  } catch (error) {
    console.error("[GET SITE CONFIG ERROR]", error);
    return DEFAULT_SITE_CONFIG;
  }
}

export async function updateSiteConfig({
  celebrationSoundEnabled,
  celebrationSoundPath,
  updatedById,
}: {
  celebrationSoundEnabled: boolean;
  celebrationSoundPath: string;
  updatedById: string;
}): Promise<SiteConfig> {
  const rows = await prisma.$queryRaw<SiteConfigRow[]>`
    INSERT INTO "SiteConfig" ("id", "celebrationSoundEnabled", "celebrationSoundPath", "updatedAt", "updatedById")
    VALUES (${SITE_CONFIG_ID}, ${celebrationSoundEnabled}, ${celebrationSoundPath}, CURRENT_TIMESTAMP, ${updatedById})
    ON CONFLICT ("id")
    DO UPDATE SET
      "celebrationSoundEnabled" = EXCLUDED."celebrationSoundEnabled",
      "celebrationSoundPath" = EXCLUDED."celebrationSoundPath",
      "updatedAt" = CURRENT_TIMESTAMP,
      "updatedById" = EXCLUDED."updatedById"
    RETURNING "celebrationSoundEnabled", "celebrationSoundPath"
  `;

  return rows[0] ?? { celebrationSoundEnabled, celebrationSoundPath };
}
