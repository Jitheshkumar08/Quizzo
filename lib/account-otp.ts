import { createHmac, randomInt, timingSafeEqual } from "crypto";

export const ACCOUNT_OTP_TTL_MINUTES = 10;

export const ACCOUNT_OTP_PURPOSES = {
  passwordReset: "password_reset",
  emailChange: "email_change",
} as const;

function otpSecret() {
  return process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || process.env.RESEND_API_KEY || "quizzo-dev-secret";
}

export function accountOtpExpiry() {
  return new Date(Date.now() + ACCOUNT_OTP_TTL_MINUTES * 60 * 1000);
}

export function generateAccountOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashAccountOtp(scope: string, purpose: string, code: string) {
  return createHmac("sha256", otpSecret())
    .update(`${purpose}:${scope.trim().toLowerCase()}:${code.trim()}`)
    .digest("hex");
}

export function verifyAccountOtp(scope: string, purpose: string, code: string, expectedHash: string) {
  const actual = Buffer.from(hashAccountOtp(scope, purpose, code), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
