import { createHmac, randomInt, timingSafeEqual } from "crypto";

const OTP_TTL_MINUTES = 10;

function otpSecret() {
  return process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || process.env.RESEND_API_KEY || "mcqify-dev-secret";
}

export function signupOtpExpiry() {
  return new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
}

export function signupOtpTtlMinutes() {
  return OTP_TTL_MINUTES;
}

export function generateSignupOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashSignupOtp(email: string, code: string) {
  return createHmac("sha256", otpSecret())
    .update(`${email.trim().toLowerCase()}:${code.trim()}`)
    .digest("hex");
}

export function verifySignupOtp(email: string, code: string, expectedHash: string) {
  const actual = Buffer.from(hashSignupOtp(email, code), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
