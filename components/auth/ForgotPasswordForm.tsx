"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2, MailCheck, RefreshCw } from "lucide-react";

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function startResendTimer() {
    setResendSeconds(30);
    window.clearInterval((window as typeof window & { mcqifyPasswordResetTimer?: number }).mcqifyPasswordResetTimer);
    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    (window as typeof window & { mcqifyPasswordResetTimer?: number }).mcqifyPasswordResetTimer = timer;
  }

  async function requestCode(nextIdentifier = identifier) {
    setError("");
    setMessage("");

    const cleanedIdentifier = nextIdentifier.trim();
    if (!cleanedIdentifier) {
      setError("Enter your email address or username.");
      return false;
    }

    const res = await fetch("/api/auth/forgot-password/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: cleanedIdentifier }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error || "Could not send the reset code. Please try again.");
      return false;
    }

    const resolvedEmail = typeof data.email === "string" ? data.email : cleanedIdentifier;
    setVerificationEmail(resolvedEmail);
    setMessage(data.message || `A reset code was sent to ${resolvedEmail}.`);
    startResendTimer();
    return true;
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await requestCode();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    setResending(true);
    try {
      await requestCode(verificationEmail);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setResending(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    const code = otpCode.trim();
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit reset code.");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail, code, newPassword }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Could not reset your password. Please try again.");
        return;
      }

      const signInResult = await signIn("credentials", {
        identifier: verificationEmail,
        password: newPassword,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push("/login");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[430px] pb-4">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl border border-white/80 bg-white/70 text-[#8C5D3E] shadow-[0_14px_28px_rgba(44,42,40,0.10)]">
          <KeyRound className="h-7 w-7" />
        </div>
        <h1 className="text-[34px] font-bold leading-tight tracking-tight text-[#1A1A1A]">Reset password</h1>
        <p className="mt-2 text-[15px] font-medium text-[#6B6863]">
          {verificationEmail ? "Verify your email and set a new password" : "Enter your email or username to receive a reset code"}
        </p>
      </div>

      <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-[#F4EFE6]/70 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.05)] backdrop-blur-2xl sm:p-8">
        <div className="absolute left-0 top-0 h-1/2 w-full rounded-t-[32px] bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />

        {!verificationEmail ? (
          <form onSubmit={handleRequest} className="relative z-10 space-y-5">
            <div className="group flex flex-col">
              <label htmlFor="resetIdentifier" className="mb-2 ml-2 text-[14px] font-bold text-[#2C2A28] transition-colors group-focus-within:text-[#8C5D3E]">
                Email or Username
              </label>
              <input
                id="resetIdentifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="example@gmail.com or username"
                required
                className="w-full rounded-full border border-white/80 bg-white/40 px-5 py-4 text-[15px] font-medium text-[#2C2A28] shadow-[inset_0_2px_6px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 placeholder:text-[#A8A296] focus:border-[#8C5D3E] focus:bg-white/90 focus:outline-none focus:ring-[4px] focus:ring-[#8C5D3E]/15"
              />
            </div>

            {error && <div className="rounded-2xl border border-red-100 bg-red-50/80 p-3.5 text-[14px] font-medium text-red-600">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#2C2A28] px-6 py-4 text-[16px] font-bold tracking-wide text-[#FDFBFA] shadow-[0_8px_20px_rgba(44,42,40,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1A1816] hover:shadow-[0_12px_24px_rgba(44,42,40,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <><Loader2 className="h-5 w-5 animate-spin" /> Sending code...</> : <>Send reset code <MailCheck className="h-4 w-4" /></>}
            </button>

            <p className="text-center text-[14px] font-medium text-[#918B80]">
              Remembered it?{" "}
              <Link href="/login" className="font-bold text-[#8C5D3E] underline-offset-4 hover:underline">
                Log in
              </Link>
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="relative z-10 space-y-4">
            <div className="overflow-hidden rounded-[24px] border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white p-1 shadow-[0_16px_34px_rgba(16,185,129,0.10)]">
              <div className="rounded-[20px] border border-white/90 bg-white/80 px-4 py-5 text-center backdrop-blur-xl">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-[0_10px_22px_rgba(16,185,129,0.15)] ring-1 ring-emerald-100">
                  <MailCheck className="h-6 w-6" />
                </div>
                <p className="text-[17px] font-black text-[#2C2A28]">Check your email</p>
                <p className="mx-auto mt-1.5 max-w-[285px] text-[13px] font-semibold leading-relaxed text-[#6B6863]">
                  Enter the 6-digit code sent to <span className="font-black text-[#2C2A28]">{verificationEmail}</span>.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-[12px] font-bold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Code expires in 10 minutes
                </div>
              </div>
            </div>

            <div className="group flex flex-col">
              <label htmlFor="resetOtpCode" className="mb-2 ml-2 text-[14px] font-bold text-[#2C2A28] transition-colors group-focus-within:text-[#8C5D3E]">
                Verification Code
              </label>
              <div className="relative rounded-[24px] border border-[#E5DCD0] bg-white/70 p-3 shadow-[0_12px_28px_rgba(44,42,40,0.08)] transition-all duration-300 group-focus-within:border-emerald-300 group-focus-within:ring-[5px] group-focus-within:ring-emerald-100">
                <input
                  id="resetOtpCode"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onPaste={(e) => {
                    e.preventDefault();
                    setOtpCode(e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6));
                  }}
                  required
                  aria-label="Verification code"
                  className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
                />
                <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                  {Array.from({ length: 6 }).map((_, index) => {
                    const digit = otpCode[index] ?? "";
                    return (
                      <div
                        key={index}
                        className={`flex aspect-square min-h-[44px] items-center justify-center rounded-xl border text-[22px] font-black shadow-sm transition-all ${digit ? "border-violet-200 bg-violet-50 text-[#2C2A28]" : "border-[#D8CDEB] bg-white text-[#B9B1A7]"}`}
                      >
                        {digit}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="w-full rounded-2xl border border-[#DED6CA] bg-[#FFFDF9] px-4 py-3.5 text-[14px] font-medium text-[#2C2A28] shadow-[inset_0_1px_3px_rgba(44,42,40,0.035)] transition-all focus:border-[#8C5D3E] focus:bg-white focus:outline-none focus:ring-[4px] focus:ring-[#8C5D3E]/15"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full rounded-2xl border border-[#DED6CA] bg-[#FFFDF9] px-4 py-3.5 text-[14px] font-medium text-[#2C2A28] shadow-[inset_0_1px_3px_rgba(44,42,40,0.035)] transition-all focus:border-[#8C5D3E] focus:bg-white focus:outline-none focus:ring-[4px] focus:ring-[#8C5D3E]/15"
              />
            </div>

            {error && <div className="rounded-2xl border border-red-100 bg-red-50/80 p-3.5 text-[14px] font-medium text-red-600">{error}</div>}
            {message && <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-3.5 text-[14px] font-medium text-emerald-700">{message}</div>}

            <button
              type="submit"
              disabled={verifying}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2C2A28] px-6 py-3.5 text-[16px] font-bold tracking-wide text-[#FDFBFA] shadow-[0_8px_20px_rgba(44,42,40,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1A1816] hover:shadow-[0_12px_24px_rgba(44,42,40,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {verifying ? <><Loader2 className="h-5 w-5 animate-spin" /> Updating...</> : <>Update password <KeyRound className="h-4 w-4" /></>}
            </button>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={resendCode}
                disabled={resendSeconds > 0 || resending}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#E3D8CA] bg-white/70 px-4 text-[13px] font-black text-[#2C2A28] shadow-sm transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 text-emerald-600" />}
                {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setVerificationEmail("");
                  setOtpCode("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setError("");
                  setMessage("");
                  setResendSeconds(0);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#E3D8CA] bg-white/50 px-4 text-[13px] font-black text-[#8C5D3E] shadow-sm transition-all hover:bg-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Edit email
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
