CREATE TABLE "SiteConfig" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "celebrationSoundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "SiteConfig_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SiteConfig" ("id", "celebrationSoundEnabled", "updatedAt")
VALUES ('global', true, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
