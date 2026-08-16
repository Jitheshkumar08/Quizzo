"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, MailCheck, RefreshCw, UserPlus } from "lucide-react";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import PasswordInput from "@/components/ui/PasswordInput";
import { authLinkWithCallback } from "@/lib/auth-callback";

const CODE_LENGTH = 6;

export default function SignupForm({
  googleEnabled,
  callbackUrl = "/dashboard",
}: {
  googleEnabled: boolean;
  callbackUrl?: string;
}) {
  const router = useRouter();
  const codeInputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const resendTimerRef = useRef<number | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [verifying, setVerifying] = useState(false);
  const [notice, setNotice] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [resending, setResending] = useState(false);
  const otpCode = otpDigits.join("");

  useEffect(() => {
    return () => {
      if (resendTimerRef.current !== null) {
        window.clearInterval(resendTimerRef.current);
      }
    };
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");

    const fullName = form.fullName.trim();
    const username = form.username.trim();
    const email = form.email.trim().toLowerCase();

    if (fullName.length < 2) {
      setError("Enter your full name using at least 2 characters.");
      return;
    }

    if (username.length < 3) {
      setError("Choose a username with at least 3 characters.");
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setError("Username can only contain letters, numbers, and underscores.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          username,
          email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Could not create your account. Please check your details and try again.");
        return;
      }

      setVerificationEmail(email);
      setOtpDigits(Array(CODE_LENGTH).fill(""));
      setNotice(`We sent a 6-digit code to ${email}.`);
      startResendTimer();
      window.setTimeout(() => focusCodeInput(0), 0);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

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

  async function resendCode() {
    setError("");
    setNotice("");
    setResending(true);

    const fullName = form.fullName.trim();
    const username = form.username.trim();
    const email = verificationEmail.trim().toLowerCase();

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          username,
          email,
          password: form.password,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Could not resend the verification code. Please try again.");
        return;
      }

      setOtpDigits(Array(CODE_LENGTH).fill(""));
      setNotice(`A new code was sent to ${email}.`);
      startResendTimer();
      window.setTimeout(() => focusCodeInput(0), 0);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setResending(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");

    const email = verificationEmail.trim().toLowerCase();
    const code = otpCode.trim();

    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit verification code.");
      const firstEmptyIndex = otpDigits.findIndex((digit) => !digit);
      focusCodeInput(firstEmptyIndex === -1 ? CODE_LENGTH - 1 : firstEmptyIndex);
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch("/api/auth/signup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Could not verify your email. Please try again.");
        return;
      }

      const signInResult = await signIn("credentials", {
        identifier: email,
        password: form.password,
        redirect: false,
      });

      if (signInResult?.error) {
        router.push(authLinkWithCallback("/login", callbackUrl));
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setVerifying(false);
    }
  }

  const fields = [
    { name: "fullName", label: "Full Name", type: "text", placeholder: "Ex: Jithesh Kumar" },
    { name: "username", label: "Username", type: "text", placeholder: "Jitheshkumar08" },
    { name: "email", label: "Email Address", type: "email", placeholder: "Jitheshkumar@quizzo.com" },
    { name: "password", label: "Password", type: "password", placeholder: "Min 8 characters" },
    { name: "confirmPassword", label: "Confirm Password", type: "password", placeholder: "Repeat password" },
  ];

  return (
    <div className={`w-full mx-auto pb-4 ${verificationEmail ? "max-w-[410px]" : "max-w-[440px]"}`}>
      {/* Header */}
      <div className={verificationEmail ? "text-center mb-4" : "text-center mb-8"}>
        <h1 className={`${verificationEmail ? "text-[26px]" : "text-[32px]"} font-bold text-[#1A1A1A] mb-2 tracking-tight leading-tight`}>Create account</h1>
        <p className="text-[#6B6863] text-[15px] font-medium">
          {verificationEmail ? "Verify your email to continue" : "Join Quizzo and start learning"}
        </p>
      </div>

      {/* Form Card with Glassmorphism */}
      <div className={`bg-[#F4EFE6]/70 backdrop-blur-2xl rounded-[32px] ${verificationEmail ? "p-5 sm:p-6" : "p-6 sm:p-8"} shadow-[0_20px_40px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.05)] border border-white/80 relative overflow-hidden`}>
        {/* Glossy highlight inside card */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-[32px]"></div>

        <div className={`relative z-10 ${verificationEmail ? "mb-4" : "mb-6"}`}>
          <GoogleAuthButton
            label="Sign up with Google"
            enabled={googleEnabled}
            callbackUrl={callbackUrl}
          />
          <div className={`${verificationEmail ? "mt-4" : "mt-6"} flex items-center gap-3`}>
            <div className="h-px flex-1 bg-[#DED7CB]" />
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#A59C90]">
              or
            </span>
            <div className="h-px flex-1 bg-[#DED7CB]" />
          </div>
        </div>

        {verificationEmail ? (
          <form onSubmit={handleVerify} className="space-y-5 relative z-10">
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

            {error && (
              <div className="p-3.5 rounded-2xl bg-red-50/80 backdrop-blur-sm border border-red-100 text-red-600 text-[14px] font-medium tracking-wide mt-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={verifying}
              className="w-full cursor-pointer py-3.5 px-6 rounded-full font-bold text-[#FDFBFA] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-[#2C2A28] hover:bg-[#1A1816] shadow-[0_8px_20px_rgba(44,42,40,0.2)] hover:shadow-[0_12px_24px_rgba(44,42,40,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_4px_10px_rgba(44,42,40,0.2)] text-[16px] tracking-wide"
            >
              {verifying ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</>
              ) : (
                <>Verify and continue <MailCheck className="w-4 h-4 ml-1" /></>
              )}
            </button>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={resendCode}
                disabled={resendSeconds > 0 || resending}
                className="inline-flex h-11 items-center cursor-pointer justify-center gap-2 rounded-2xl border border-[#E3D8CA] bg-white/70 px-4 text-[13px] font-black text-[#2C2A28] shadow-sm transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 text-emerald-600" />}
                {resendSeconds > 0 ? `Resend in ${resendSeconds}s` : "Resend code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setVerificationEmail("");
                  setOtpDigits(Array(CODE_LENGTH).fill(""));
                  setError("");
                  setNotice("");
                  setResendSeconds(0);
                  if (resendTimerRef.current !== null) {
                    window.clearInterval(resendTimerRef.current);
                    resendTimerRef.current = null;
                  }
                }}
                className="inline-flex cursor-pointer h-11 items-center justify-center gap-2 rounded-2xl border border-[#E3D8CA] bg-white/50 px-4 text-[13px] font-black text-[#8C5D3E] shadow-sm transition-all hover:bg-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Edit details
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            {fields.map((field) => (
              <div key={field.name} className="flex flex-col mb-1 group">
                <label htmlFor={field.name} className="text-[14px] font-bold text-[#2C2A28] ml-2 mb-2 transition-colors group-focus-within:text-[#8C5D3E]">
                  {field.label}
                </label>
                {field.type === "password" ? (
                  <PasswordInput
                    id={field.name}
                    name={field.name}
                    value={form[field.name as keyof typeof form]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    autoComplete={field.name === "password" ? "new-password" : "new-password"}
                    required
                    className="w-full rounded-full border border-white/80 bg-white/40 px-5 py-4 text-[15px] font-medium text-[#2C2A28] shadow-[inset_0_2px_6px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 placeholder:text-[#A8A296] focus:border-[#8C5D3E] focus:bg-white/90 focus:outline-none focus:ring-[4px] focus:ring-[#8C5D3E]/15"
                  />
                ) : (
                  <input
                    id={field.name}
                    name={field.name}
                    type={field.type}
                    value={form[field.name as keyof typeof form]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    required
                    className="w-full rounded-full border border-white/80 bg-white/40 px-5 py-4 text-[15px] font-medium text-[#2C2A28] shadow-[inset_0_2px_6px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 placeholder:text-[#A8A296] focus:border-[#8C5D3E] focus:bg-white/90 focus:outline-none focus:ring-[4px] focus:ring-[#8C5D3E]/15"
                  />
                )}
              </div>
            ))}

            {/* Error */}
            {error && (
              <div className="p-3.5 rounded-2xl bg-red-50/80 backdrop-blur-sm border border-red-100 text-red-600 text-[14px] font-medium tracking-wide mt-3">
                {error}
              </div>
            )}
            {notice && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 backdrop-blur-sm border border-emerald-100 text-emerald-700 text-[14px] font-medium tracking-wide mt-3">
                {notice}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 mt-6 rounded-full font-bold text-[#FDFBFA] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-[#2C2A28] hover:bg-[#1A1816] shadow-[0_8px_20px_rgba(44,42,40,0.2)] hover:shadow-[0_12px_24px_rgba(44,42,40,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_4px_10px_rgba(44,42,40,0.2)] text-[16px] tracking-wide"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Creating account...</>
              ) : (
                <>Create account <UserPlus className="w-4 h-4 ml-1" /></>
              )}
            </button>
          </form>
        )}

        {/* Footer */}
        <p className="text-center text-[14px] text-[#918B80] mt-6 font-medium relative z-10">
          Already have an account?{" "}
          <Link href={authLinkWithCallback("/login", callbackUrl)} className="text-[#8C5D3E] hover:text-[#6E482F] font-bold transition-colors hover:underline underline-offset-4 decoration-2">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
