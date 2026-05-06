CREATE TABLE IF NOT EXISTS "AccountOtpVerification" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "email" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "payload" JSONB,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AccountOtpVerification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AccountOtpVerification_userId_purpose_idx"
ON "AccountOtpVerification" ("userId", "purpose");

CREATE INDEX IF NOT EXISTS "AccountOtpVerification_email_purpose_idx"
ON "AccountOtpVerification" ("email", "purpose");

CREATE INDEX IF NOT EXISTS "AccountOtpVerification_expiresAt_idx"
ON "AccountOtpVerification" ("expiresAt");
