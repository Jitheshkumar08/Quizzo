"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, LogIn } from "lucide-react";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import PasswordInput from "@/components/ui/PasswordInput";
import { authLinkWithCallback } from "@/lib/auth-callback";

export default function LoginForm({
  googleEnabled,
  callbackUrl = "/dashboard",
}: {
  googleEnabled: boolean;
  callbackUrl?: string;
}) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const cleanedIdentifier = identifier.trim();
    if (!cleanedIdentifier) {
      setError("Enter your email address or username.");
      return;
    }

    if (!password) {
      setError("Enter your password.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        identifier: cleanedIdentifier,
        password,
        redirect: false,
      });

      if (result?.error) {
        const checkRes = await fetch("/api/auth/login-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier: cleanedIdentifier, password }),
        });
        const checkData = await checkRes.json().catch(() => ({}));

        setError(
          typeof checkData.error === "string"
            ? checkData.error
            : "Could not verify your login. Please try again."
        );
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[420px] mx-auto pb-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-[46px] font-bold text-[#1A1A1A] mb-2 tracking-tight leading-tight">Welcome back</h1>
        <p className="text-[#6B6863] text-[15px] font-medium">Sign in to your account</p>
      </div>

      {/* Form Card with Glassmorphism */}
      <div className="bg-[#F4EFE6]/70 backdrop-blur-2xl rounded-[32px] p-6 sm:p-8 shadow-[0_20px_40px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.05)] border border-white/80 relative overflow-hidden">
        {/* Glossy highlight inside card */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-[32px]"></div>

        <div className="relative z-10 mb-6">
          <GoogleAuthButton
            label="Continue with Google"
            enabled={googleEnabled}
            callbackUrl={callbackUrl}
          />
          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#DED7CB]" />
            <span className="text-[11px] font-black uppercase tracking-[0.18em] text-[#A59C90]">
              or
            </span>
            <div className="h-px flex-1 bg-[#DED7CB]" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {/* Identifier */}
          <div className="flex flex-col mb-1 group">
            <label htmlFor="identifier" className="text-[14px] font-bold text-[#2C2A28] ml-2 mb-2 transition-colors group-focus-within:text-[#8C5D3E]">
              Email or Username
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="example@gmail.com"
              required
              className="w-full px-5 py-4 rounded-full bg-white/40 border border-white/80 text-[#2C2A28] placeholder-[#A8A296] focus:outline-none focus:bg-white/90 focus:border-[#8C5D3E] focus:ring-[4px] focus:ring-[#8C5D3E]/15 transition-all duration-300 text-[15px] shadow-[inset_0_2px_6px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.04)] backdrop-blur-xl font-medium"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col mb-1 group">
            <div className="flex items-center justify-between ml-2 mb-2">
              <label htmlFor="password" className="text-[14px] font-bold text-[#2C2A28] transition-colors group-focus-within:text-[#8C5D3E]">
                Password
              </label>
              <Link href="/forgot-password" className="text-[13px] font-bold text-[#918B80] hover:text-[#8C5D3E] transition-colors mr-2">
                Forgot password?
              </Link>
            </div>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full rounded-full border border-white/80 bg-white/40 px-5 py-4 text-[15px] font-medium text-[#2C2A28] shadow-[inset_0_2px_6px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.04)] backdrop-blur-xl transition-all duration-300 placeholder:text-[#A8A296] focus:border-[#8C5D3E] focus:bg-white/90 focus:outline-none focus:ring-[4px] focus:ring-[#8C5D3E]/15"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50/80 backdrop-blur-sm border border-red-100 text-red-600 text-[14px] font-medium tracking-wide mt-3">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 mt-6 rounded-full font-bold text-[#FDFBFA] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-[#2C2A28] hover:bg-[#1A1816] shadow-[0_8px_20px_rgba(44,42,40,0.2)] hover:shadow-[0_12px_24px_rgba(44,42,40,0.3)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_4px_10px_rgba(44,42,40,0.2)] text-[16px] tracking-wide"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Signing in...</>
            ) : (
              <>Sign in <LogIn className="w-4 h-4 ml-1" /></>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-[14px] text-[#918B80] mt-6 font-medium relative z-10">
          Don&apos;t have an account?{" "}
          <Link href={authLinkWithCallback("/signup", callbackUrl)} className="text-[#8C5D3E] hover:text-[#6E482F] font-bold transition-colors hover:underline underline-offset-4 decoration-2">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
