CREATE TABLE "ResultListEvent" (
    "id" TEXT NOT NULL,
    "quizId" TEXT,
    "resultId" TEXT,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResultListEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ResultListEvent_createdAt_idx" ON "ResultListEvent"("createdAt");
CREATE INDEX "ResultListEvent_quizId_idx" ON "ResultListEvent"("quizId");
CREATE INDEX "ResultListEvent_resultId_idx" ON "ResultListEvent"("resultId");

ALTER TABLE "ResultListEvent" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow result list event reads"
ON "ResultListEvent"
FOR SELECT
TO anon
USING (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE "ResultListEvent";
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
