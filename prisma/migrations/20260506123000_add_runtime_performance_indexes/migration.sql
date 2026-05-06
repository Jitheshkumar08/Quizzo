CREATE INDEX IF NOT EXISTS "Quiz_isPublished_createdAt_idx"
ON "Quiz" ("isPublished", "createdAt");

CREATE INDEX IF NOT EXISTS "Quiz_createdById_createdAt_idx"
ON "Quiz" ("createdById", "createdAt");

CREATE INDEX IF NOT EXISTS "Question_quizId_order_idx"
ON "Question" ("quizId", "order");

CREATE INDEX IF NOT EXISTS "Result_quizId_studentId_attemptType_idx"
ON "Result" ("quizId", "studentId", "attemptType");

CREATE INDEX IF NOT EXISTS "Result_quizId_attemptType_idx"
ON "Result" ("quizId", "attemptType");

CREATE INDEX IF NOT EXISTS "Result_studentId_createdAt_idx"
ON "Result" ("studentId", "createdAt");

CREATE INDEX IF NOT EXISTS "QuizSession_quizId_studentId_submittedAt_idx"
ON "QuizSession" ("quizId", "studentId", "submittedAt");

CREATE INDEX IF NOT EXISTS "QuizSession_studentId_submittedAt_idx"
ON "QuizSession" ("studentId", "submittedAt");
