ALTER TABLE "SiteConfig"
ADD COLUMN IF NOT EXISTS "celebrationRules" JSONB NOT NULL DEFAULT '[]'::jsonb;
