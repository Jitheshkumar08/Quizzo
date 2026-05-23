import { prisma } from "@/lib/prisma";

const SITE_CONFIG_ID = "global";

export interface SiteConfig {
  celebrationSoundEnabled: boolean;
}

interface SiteConfigRow {
  celebrationSoundEnabled: boolean;
}

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  celebrationSoundEnabled: true,
};

export async function getSiteConfig(): Promise<SiteConfig> {
  try {
    const rows = await prisma.$queryRaw<SiteConfigRow[]>`
      SELECT "celebrationSoundEnabled"
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
  updatedById,
}: {
  celebrationSoundEnabled: boolean;
  updatedById: string;
}): Promise<SiteConfig> {
  const rows = await prisma.$queryRaw<SiteConfigRow[]>`
    INSERT INTO "SiteConfig" ("id", "celebrationSoundEnabled", "updatedAt", "updatedById")
    VALUES (${SITE_CONFIG_ID}, ${celebrationSoundEnabled}, CURRENT_TIMESTAMP, ${updatedById})
    ON CONFLICT ("id")
    DO UPDATE SET
      "celebrationSoundEnabled" = EXCLUDED."celebrationSoundEnabled",
      "updatedAt" = CURRENT_TIMESTAMP,
      "updatedById" = EXCLUDED."updatedById"
    RETURNING "celebrationSoundEnabled"
  `;

  return rows[0] ?? { celebrationSoundEnabled };
}
