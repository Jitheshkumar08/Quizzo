ALTER TABLE "Result"
  ADD COLUMN "titleOverride" TEXT,
  ADD COLUMN "questionIds" JSONB,
  ADD COLUMN "sourceResultId" TEXT,
  ADD COLUMN "attemptType" TEXT NOT NULL DEFAULT 'NORMAL';

CREATE TABLE "RemedialQuizSession" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "sourceResultId" TEXT NOT NULL,
  "quizId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "questionIds" JSONB NOT NULL,
  "currentAnswers" JSONB,
  "resultId" TEXT,
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "RemedialQuizSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RemedialQuizSession_sourceResultId_studentId_idx"
  ON "RemedialQuizSession"("sourceResultId", "studentId");

CREATE INDEX "RemedialQuizSession_quizId_studentId_idx"
  ON "RemedialQuizSession"("quizId", "studentId");

CREATE INDEX "RemedialQuizSession_resultId_idx"
  ON "RemedialQuizSession"("resultId");

ALTER TABLE "RemedialQuizSession"
  ADD CONSTRAINT "RemedialQuizSession_sourceResultId_fkey"
  FOREIGN KEY ("sourceResultId") REFERENCES "Result"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RemedialQuizSession"
  ADD CONSTRAINT "RemedialQuizSession_quizId_fkey"
  FOREIGN KEY ("quizId") REFERENCES "Quiz"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RemedialQuizSession"
  ADD CONSTRAINT "RemedialQuizSession_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
