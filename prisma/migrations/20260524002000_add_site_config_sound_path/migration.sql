ALTER TABLE "SiteConfig"
ADD COLUMN IF NOT EXISTS "celebrationSoundPath" TEXT NOT NULL DEFAULT '/assets/congralutions.mp3';
