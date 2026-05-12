ALTER TABLE "Quiz" ADD COLUMN "isClosed" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Quiz_isPublished_isClosed_createdAt_idx" ON "Quiz"("isPublished", "isClosed", "createdAt");
