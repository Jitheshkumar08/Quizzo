"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Loader2, MailCheck, RefreshCw, UserPlus } from "lucide-react";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";

export default function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [notice, setNotice] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [resending, setResending] = useState(false);

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
      setNotice(`We sent a 6-digit code to ${email}.`);
      startResendTimer();
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function startResendTimer() {
    setResendSeconds(30);
    window.clearInterval((window as typeof window & { mcqifySignupResendTimer?: number }).mcqifySignupResendTimer);
    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    (window as typeof window & { mcqifySignupResendTimer?: number }).mcqifySignupResendTimer = timer;
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

      setNotice(`A new code was sent to ${email}.`);
      startResendTimer();
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
        router.push("/login?registered=true");
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

  const fields = [
    { name: "fullName", label: "Full Name", type: "text", placeholder: "Jithesh Kumar" },
    { name: "username", label: "Username", type: "text", placeholder: "jithesh_123" },
    { name: "email", label: "Email Address", type: "email", placeholder: "jithesh@example.com" },
    { name: "password", label: "Password", type: "password", placeholder: "Min 8 characters" },
    { name: "confirmPassword", label: "Confirm Password", type: "password", placeholder: "Repeat password" },
  ];

  return (
    <div className={`w-full mx-auto pb-4 ${verificationEmail ? "max-w-[410px]" : "max-w-[440px]"}`}>
      {/* Header */}
      <div className={verificationEmail ? "text-center mb-4" : "text-center mb-8"}>
        <h1 className={`${verificationEmail ? "text-[26px]" : "text-[32px]"} font-bold text-[#1A1A1A] mb-2 tracking-tight leading-tight`}>Create account</h1>
        <p className="text-[#6B6863] text-[15px] font-medium">
          {verificationEmail ? "Verify your email to continue" : "Join MCQify and start learning"}
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
          <form onSubmit={handleVerify} className="space-y-4 relative z-10">
            <div className="overflow-hidden rounded-[24px] border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white p-1 shadow-[0_16px_34px_rgba(16,185,129,0.10)]">
              <div className="rounded-[20px] border border-white/90 bg-white/78 px-4 py-5 text-center backdrop-blur-xl">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-[0_10px_22px_rgba(16,185,129,0.15)] ring-1 ring-emerald-100">
                  <MailCheck className="h-6 w-6" />
                </div>
                <p className="text-[17px] font-black text-[#2C2A28]">Check your email</p>
                <p className="mx-auto mt-1.5 max-w-[280px] text-[13px] font-semibold leading-relaxed text-[#6B6863]">
                  Enter the 6-digit code sent to <span className="font-black text-[#2C2A28]">{verificationEmail}</span>.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-[12px] font-bold text-emerald-700">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Code expires in 10 minutes
                </div>
              </div>
            </div>

            <div className="flex flex-col group">
              <label htmlFor="otpCode" className="text-[14px] font-bold text-[#2C2A28] ml-2 mb-2 transition-colors group-focus-within:text-[#8C5D3E]">
                Verification Code
              </label>
              <div className="relative rounded-[24px] border border-[#E5DCD0] bg-white/70 p-3 shadow-[0_12px_28px_rgba(44,42,40,0.08)] transition-all duration-300 group-focus-within:border-emerald-300 group-focus-within:ring-[5px] group-focus-within:ring-emerald-100">
                <input
                  id="otpCode"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onPaste={(e) => {
                    e.preventDefault();
                    setOtpCode(e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6));
                  }}
                  required
                  className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
                  aria-label="Verification code"
                />
                <div className="grid grid-cols-6 gap-2 sm:gap-2.5">
                  {Array.from({ length: 6 }).map((_, index) => {
                    const digit = otpCode[index] ?? "";
                    return (
                      <div
                        key={index}
                        className={`flex aspect-square min-h-[44px] items-center justify-center rounded-xl border text-[22px] font-black shadow-sm transition-all ${digit
                          ? "border-violet-200 bg-violet-50 text-[#2C2A28]"
                          : "border-[#D8CDEB] bg-white text-[#B9B1A7]"
                          }`}
                      >
                        {digit || ""}
                      </div>
                    );
                  })}
                </div>
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
                  setOtpCode("");
                  setError("");
                  setNotice("");
                  setResendSeconds(0);
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
                <div className="relative">
                  <input
                    id={field.name}
                    name={field.name}
                    type={
                      field.type === "password"
                        ? showPassword
                          ? "text"
                          : "password"
                        : field.type
                    }
                    value={form[field.name as keyof typeof form]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    required
                    className="w-full px-5 py-4 rounded-full bg-white/40 border border-white/80 text-[#2C2A28] placeholder-[#A8A296] focus:outline-none focus:bg-white/90 focus:border-[#8C5D3E] focus:ring-[4px] focus:ring-[#8C5D3E]/15 transition-all duration-300 text-[15px] shadow-[inset_0_2px_6px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.04)] backdrop-blur-xl font-medium"
                  />
                  {field.type === "password" && (
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 text-[#A8A296] hover:text-[#2C2A28] transition-colors rounded-full hover:bg-black/5"
                    >
                      {showPassword ? <EyeOff className="w-[18px] h-[18px]" /> : <Eye className="w-[18px] h-[18px]" />}
                    </button>
                  )}
                </div>
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
          <Link href="/login" className="text-[#8C5D3E] hover:text-[#6E482F] font-bold transition-colors hover:underline underline-offset-4 decoration-2">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
