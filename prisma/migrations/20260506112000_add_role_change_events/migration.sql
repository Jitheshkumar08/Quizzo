CREATE TABLE "RoleChangeEvent" (
    "id" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleChangeEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RoleChangeEvent_createdAt_idx" ON "RoleChangeEvent"("createdAt");
CREATE INDEX "RoleChangeEvent_targetUserId_idx" ON "RoleChangeEvent"("targetUserId");

ALTER TABLE "RoleChangeEvent" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow role change event reads"
ON "RoleChangeEvent"
FOR SELECT
TO anon
USING (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE "RoleChangeEvent";
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
