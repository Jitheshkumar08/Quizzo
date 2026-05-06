CREATE TABLE IF NOT EXISTS "EmailSignupVerification" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "username" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "EmailSignupVerification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailSignupVerification_email_key"
ON "EmailSignupVerification" ("email");

CREATE INDEX IF NOT EXISTS "EmailSignupVerification_username_idx"
ON "EmailSignupVerification" ("username");

CREATE INDEX IF NOT EXISTS "EmailSignupVerification_expiresAt_idx"
ON "EmailSignupVerification" ("expiresAt");
