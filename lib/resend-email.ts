import { signupOtpTtlMinutes } from "@/lib/signup-otp";
import { ACCOUNT_OTP_TTL_MINUTES } from "@/lib/account-otp";

type SendSignupOtpEmailArgs = {
  to: string;
  fullName: string;
  code: string;
};

type SendAccountOtpEmailArgs = SendSignupOtpEmailArgs;

export class ResendNotConfiguredError extends Error {
  constructor() {
    super("Email verification is not configured. Add RESEND_API_KEY and RESEND_FROM_EMAIL.");
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendOtpEmail({
  to,
  fullName,
  code,
  subject,
  intro,
  textAction,
  ttlMinutes,
}: SendSignupOtpEmailArgs & {
  subject: string;
  intro: string;
  textAction: string;
  ttlMinutes: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM;

  if (!apiKey || !from) {
    throw new ResendNotConfiguredError();
  }

  const safeFullName = escapeHtml(fullName);
  const safeIntro = escapeHtml(intro);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text: `Hi ${fullName},\n\nYour MCQify verification code is ${code}.\n\n${textAction}\n\nThis code expires in ${ttlMinutes} minutes.\n\nIf you did not request this, you can ignore this email.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px;color:#1f1d1b">
          <h1 style="margin:0 0 12px;font-size:24px">${escapeHtml(subject)}</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5">Hi ${safeFullName}, ${safeIntro}</p>
          <div style="letter-spacing:8px;font-size:32px;font-weight:800;background:#f4efe6;border:1px solid #e8ded0;border-radius:16px;padding:18px 22px;text-align:center">${code}</div>
          <p style="margin:20px 0 0;font-size:13px;color:#756f66">This code expires in ${ttlMinutes} minutes. If you did not request this, you can ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const details = await res.text().catch(() => "");
    throw new Error(`Resend email failed: ${res.status} ${details}`);
  }
}

export async function sendSignupOtpEmail(args: SendSignupOtpEmailArgs) {
  return sendOtpEmail({
    ...args,
    subject: "Verify your MCQify email",
    intro: "use this code to finish creating your account.",
    textAction: "Use this code to finish creating your account.",
    ttlMinutes: signupOtpTtlMinutes(),
  });
}

export async function sendPasswordResetOtpEmail(args: SendAccountOtpEmailArgs) {
  return sendOtpEmail({
    ...args,
    subject: "Reset your MCQify password",
    intro: "use this code to set a new password.",
    textAction: "Use this code to set a new password.",
    ttlMinutes: ACCOUNT_OTP_TTL_MINUTES,
  });
}

export async function sendEmailChangeOtpEmail(args: SendAccountOtpEmailArgs) {
  return sendOtpEmail({
    ...args,
    subject: "Verify your new MCQify email",
    intro: "use this code to confirm this email address.",
    textAction: "Use this code to confirm this email address.",
    ttlMinutes: ACCOUNT_OTP_TTL_MINUTES,
  });
}
