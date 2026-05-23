CREATE TABLE "QuizShareAlias" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizShareAlias_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuizShareAlias_slug_key" ON "QuizShareAlias"("slug");
CREATE INDEX "QuizShareAlias_quizId_idx" ON "QuizShareAlias"("quizId");

ALTER TABLE "QuizShareAlias" ADD CONSTRAINT "QuizShareAlias_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
