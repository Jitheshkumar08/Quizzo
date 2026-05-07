"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, MailCheck, RefreshCw } from "lucide-react";
import PasswordInput from "@/components/ui/PasswordInput";

type ResetStep = "request" | "code" | "password";

const CODE_LENGTH = 6;

export default function ForgotPasswordForm() {
  const router = useRouter();
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const resendTimerRef = useRef<number | null>(null);
  const [step, setStep] = useState<ResetStep>("request");
  const [identifier, setIdentifier] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const otpCode = otpDigits.join("");

  useEffect(() => {
    return () => {
      if (resendTimerRef.current !== null) {
        window.clearInterval(resendTimerRef.current);
      }
    };
  }, []);

  function startResendTimer() {
    setResendSeconds(30);
    if (resendTimerRef.current !== null) {
      window.clearInterval(resendTimerRef.current);
    }
    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timer);
          resendTimerRef.current = null;
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    resendTimerRef.current = timer;
  }

  function focusCodeInput(index: number) {
    codeInputRefs.current[index]?.focus();
    codeInputRefs.current[index]?.select();
  }

  function setOtpDigit(index: number, digit: string) {
    setOtpDigits((current) => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
  }

  function fillOtpDigits(value: string, startIndex = 0) {
    const digits = value.replace(/\D/g, "").slice(0, CODE_LENGTH - startIndex).split("");
    if (digits.length === 0) return;

    setOtpDigits((current) => {
      const next = [...current];
      digits.forEach((digit, offset) => {
        next[startIndex + offset] = digit;
      });
      return next;
    });

    const nextIndex = Math.min(startIndex + digits.length, CODE_LENGTH - 1);
    window.setTimeout(() => focusCodeInput(nextIndex), 0);
  }

  function handleOtpChange(value: string, index: number) {
    const digits = value.replace(/\D/g, "");

    if (!digits) {
      setOtpDigit(index, "");
      return;
    }

    if (digits.length === 1) {
      setOtpDigit(index, digits);
      if (index < CODE_LENGTH - 1) {
        window.setTimeout(() => focusCodeInput(index + 1), 0);
      }
      return;
    }

    fillOtpDigits(digits, index);
  }

  function handleOtpBackspace(index: number) {
    if (otpDigits[index]) {
      setOtpDigit(index, "");
      window.setTimeout(() => focusCodeInput(index), 0);
      return;
    }

    if (index > 0) {
      setOtpDigit(index - 1, "");
      window.setTimeout(() => focusCodeInput(index - 1), 0);
    }
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
    setOtpDigits(Array(CODE_LENGTH).fill(""));
    setStep("code");
    setMessage(data.message || `A reset code was sent to ${resolvedEmail}.`);
    startResendTimer();
    window.setTimeout(() => focusCodeInput(0), 0);
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

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!/^\d{6}$/.test(otpCode)) {
      setError("Enter the 6-digit reset code.");
      const firstEmptyIndex = otpDigits.findIndex((digit) => !digit);
      focusCodeInput(firstEmptyIndex === -1 ? CODE_LENGTH - 1 : firstEmptyIndex);
      return;
    }

    setCheckingCode(true);
    try {
      const res = await fetch("/api/auth/forgot-password/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail, code: otpCode }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Could not verify the reset code. Please try again.");
        return;
      }

      setStep("password");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setCheckingCode(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setUpdatingPassword(true);
    try {
      const res = await fetch("/api/auth/forgot-password/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail, code: otpCode, newPassword }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setStep("code");
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
      setUpdatingPassword(false);
    }
  }

  function editEmail() {
    setStep("request");
    setVerificationEmail("");
    setOtpDigits(Array(CODE_LENGTH).fill(""));
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setMessage("");
    setResendSeconds(0);
    if (resendTimerRef.current !== null) {
      window.clearInterval(resendTimerRef.current);
      resendTimerRef.current = null;
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
          {step === "request" && "Enter your email or username to receive a reset code"}
          {step === "code" && "Verify your email before setting a new password"}
          {step === "password" && "Create a new password for your account"}
        </p>
      </div>

      <div className="relative overflow-hidden rounded-[32px] border border-white/80 bg-[#F4EFE6]/70 p-6 shadow-[0_20px_40px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.05)] backdrop-blur-2xl sm:p-8">
        <div className="absolute left-0 top-0 h-1/2 w-full rounded-t-[32px] bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />

        {step === "request" && (
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
        )}

        {step === "code" && (
          <form onSubmit={handleVerifyCode} className="relative z-10 space-y-5">
            <div className="rounded-[28px] border border-[#E8E0D5] bg-[#FFFDF9]/90 px-5 py-6 text-center shadow-[0_16px_36px_rgba(44,42,40,0.08)]">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#8C5D3E] shadow-[0_10px_22px_rgba(44,42,40,0.08)] ring-1 ring-[#E8E0D5]">
                <MailCheck className="h-6 w-6" />
              </div>
              <p className="text-[18px] font-black text-[#2C2A28]">Check your email</p>
              <p className="mx-auto mt-2 max-w-[295px] text-[14px] font-semibold leading-relaxed text-[#6B6863]">
                Enter the 6-digit code sent to <span className="font-black text-[#2C2A28]">{verificationEmail}</span>.
              </p>
              <div className="mx-auto mt-4 flex max-w-[320px] items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] font-black text-emerald-700">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Code expires in 10 minutes
              </div>
            </div>

            <div>
              <label className="mb-3 block text-[15px] font-black text-[#2C2A28]">
                Verification Code
              </label>
              <div className="grid grid-cols-6 gap-2 sm:gap-3">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(input) => {
                      codeInputRefs.current[index] = input;
                    }}
                    value={digit}
                    onChange={(e) => handleOtpChange(e.target.value, index)}
                    onClick={(e) => e.currentTarget.select()}
                    onFocus={(e) => e.target.select()}
                    onPaste={(e) => {
                      e.preventDefault();
                      fillOtpDigits(e.clipboardData.getData("text"), index);
                    }}
                    onKeyDown={(e) => {
                      if (e.ctrlKey || e.metaKey || e.altKey) {
                        return;
                      }
                      if (/^\d$/.test(e.key)) {
                        e.preventDefault();
                        setOtpDigit(index, e.key);
                        if (index < CODE_LENGTH - 1) {
                          window.setTimeout(() => focusCodeInput(index + 1), 0);
                        }
                        return;
                      }
                      if (e.key === "Backspace") {
                        e.preventDefault();
                        handleOtpBackspace(index);
                        return;
                      }
                      if (e.key === "Delete") {
                        e.preventDefault();
                        setOtpDigit(index, "");
                        return;
                      }
                      if (e.key === "ArrowLeft" && index > 0) {
                        e.preventDefault();
                        focusCodeInput(index - 1);
                        return;
                      }
                      if (e.key === "ArrowRight" && index < CODE_LENGTH - 1) {
                        e.preventDefault();
                        focusCodeInput(index + 1);
                        return;
                      }
                      if (e.key.length === 1) {
                        e.preventDefault();
                      }
                    }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    aria-label={`Verification code digit ${index + 1}`}
                    className="aspect-square min-h-[52px] w-full rounded-2xl border border-[#E1D8CE] bg-[#F8F7F5] text-center text-[25px] font-black text-[#1F1B19] shadow-[0_8px_18px_rgba(44,42,40,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all placeholder:text-transparent focus:border-[#1F1B19] focus:bg-white focus:outline-none focus:ring-[3px] focus:ring-[#1F1B19]/10"
                    maxLength={index === 0 ? CODE_LENGTH : 1}
                  />
                ))}
              </div>
            </div>

            {error && <div className="rounded-2xl border border-red-100 bg-red-50/90 p-3.5 text-[14px] font-semibold text-red-600">{error}</div>}
            <button
              type="submit"
              disabled={checkingCode}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2C2A28] px-6 py-4 text-[16px] font-bold tracking-wide text-[#FDFBFA] shadow-[0_8px_20px_rgba(44,42,40,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1A1816] hover:shadow-[0_12px_24px_rgba(44,42,40,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkingCode ? <><Loader2 className="h-5 w-5 animate-spin" /> Verifying...</> : <>Verify code <CheckCircle2 className="h-4 w-4" /></>}
            </button>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={resendCode}
                disabled={resendSeconds > 0 || resending}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#E3D8CA] bg-white/75 px-4 text-[13px] font-black text-[#2C2A28] shadow-sm transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 text-emerald-600" />}
                {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend code"}
              </button>
              <button
                type="button"
                onClick={editEmail}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#E3D8CA] bg-white/60 px-4 text-[13px] font-black text-[#8C5D3E] shadow-sm transition-all hover:bg-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Edit email
              </button>
            </div>
          </form>
        )}

        {step === "password" && (
          <form onSubmit={handleUpdatePassword} className="relative z-10 space-y-5">
            <div className="rounded-[28px] border border-emerald-100 bg-emerald-50/80 px-5 py-4 text-[14px] font-bold leading-relaxed text-emerald-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                Code verified for {verificationEmail}
              </div>
            </div>

            <div className="space-y-4">
              <div className="group flex flex-col">
                <label htmlFor="newPassword" className="mb-2 ml-2 text-[14px] font-bold text-[#2C2A28] transition-colors group-focus-within:text-[#8C5D3E]">
                  New password
                </label>
                <PasswordInput
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  className="w-full rounded-full border border-white/80 bg-white/50 px-5 py-4 text-[15px] font-medium text-[#2C2A28] shadow-[inset_0_2px_6px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 placeholder:text-[#A8A296] focus:border-[#8C5D3E] focus:bg-white/90 focus:outline-none focus:ring-[4px] focus:ring-[#8C5D3E]/15"
                />
              </div>

              <div className="group flex flex-col">
                <label htmlFor="confirmPassword" className="mb-2 ml-2 text-[14px] font-bold text-[#2C2A28] transition-colors group-focus-within:text-[#8C5D3E]">
                  Confirm password
                </label>
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  className="w-full rounded-full border border-white/80 bg-white/50 px-5 py-4 text-[15px] font-medium text-[#2C2A28] shadow-[inset_0_2px_6px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 placeholder:text-[#A8A296] focus:border-[#8C5D3E] focus:bg-white/90 focus:outline-none focus:ring-[4px] focus:ring-[#8C5D3E]/15"
                />
              </div>
            </div>

            {error && <div className="rounded-2xl border border-red-100 bg-red-50/90 p-3.5 text-[14px] font-semibold text-red-600">{error}</div>}
            {message && <div className="rounded-2xl border border-emerald-100 bg-emerald-50/90 p-3.5 text-[14px] font-semibold text-emerald-700">{message}</div>}

            <button
              type="submit"
              disabled={updatingPassword}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2C2A28] px-6 py-4 text-[16px] font-bold tracking-wide text-[#FDFBFA] shadow-[0_8px_20px_rgba(44,42,40,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#1A1816] hover:shadow-[0_12px_24px_rgba(44,42,40,0.3)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {updatingPassword ? <><Loader2 className="h-5 w-5 animate-spin" /> Updating...</> : <>Update password <KeyRound className="h-4 w-4" /></>}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("code");
                setNewPassword("");
                setConfirmPassword("");
                setError("");
                setMessage("");
                window.setTimeout(() => focusCodeInput(0), 0);
              }}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#E3D8CA] bg-white/65 px-4 text-[13px] font-black text-[#8C5D3E] shadow-sm transition-all hover:bg-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to verification code
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
