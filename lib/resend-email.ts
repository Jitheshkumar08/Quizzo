import { signupOtpTtlMinutes } from "@/lib/signup-otp";

type SendSignupOtpEmailArgs = {
  to: string;
  fullName: string;
  code: string;
};

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

export async function sendSignupOtpEmail({ to, fullName, code }: SendSignupOtpEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM;

  if (!apiKey || !from) {
    throw new ResendNotConfiguredError();
  }

  const ttl = signupOtpTtlMinutes();
  const safeFullName = escapeHtml(fullName);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: "Verify your MCQify email",
      text: `Hi ${fullName},\n\nYour MCQify verification code is ${code}.\n\nThis code expires in ${ttl} minutes.\n\nIf you did not request this, you can ignore this email.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px;color:#1f1d1b">
          <h1 style="margin:0 0 12px;font-size:24px">Verify your MCQify email</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.5">Hi ${safeFullName}, use this code to finish creating your account.</p>
          <div style="letter-spacing:8px;font-size:32px;font-weight:800;background:#f4efe6;border:1px solid #e8ded0;border-radius:16px;padding:18px 22px;text-align:center">${code}</div>
          <p style="margin:20px 0 0;font-size:13px;color:#756f66">This code expires in ${ttl} minutes. If you did not request this, you can ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const details = await res.text().catch(() => "");
    throw new Error(`Resend email failed: ${res.status} ${details}`);
  }
}
