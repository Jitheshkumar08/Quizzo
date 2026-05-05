CREATE TABLE "QuizListEvent" (
    "id" TEXT NOT NULL,
    "quizId" TEXT,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizListEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "QuizListEvent_createdAt_idx" ON "QuizListEvent"("createdAt");
CREATE INDEX "QuizListEvent_quizId_idx" ON "QuizListEvent"("quizId");

ALTER TABLE "QuizListEvent" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow quiz list event reads"
ON "QuizListEvent"
FOR SELECT
TO anon
USING (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE "QuizListEvent";
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
