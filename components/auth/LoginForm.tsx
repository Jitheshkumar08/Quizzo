"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        identifier,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid credentials. Please check your email/username and password.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Welcome back</h1>
        <p className="text-white/60">Sign in to your MCQify account</p>
      </div>

      {/* Form */}
      <div className="bg-[#121214]/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/[0.05] relative overflow-hidden">
        {/* Subtle inner gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {/* Identifier */}
          <div className="space-y-2">
            <label htmlFor="identifier" className="text-sm font-medium text-white/70 pl-1">
              Email or Username
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/80 focus:ring-4 focus:ring-purple-500/10 transition-all duration-300"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-white/70 pl-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3.5 pr-12 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/80 focus:ring-4 focus:ring-purple-500/10 transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white/40 hover:text-white/80 transition-colors rounded-md"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-6 mt-6 rounded-xl font-semibold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(139,92,246,0.3)] active:scale-[0.98] border border-white/10"
            style={{ background: "linear-gradient(135deg, hsl(262 80% 60%), hsl(199 89% 45%))" }}
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Signing in...</>
            ) : (
              <><LogIn className="w-5 h-5" /> Sign in</>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-white/50 mt-6 relative z-10">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors hover:underline underline-offset-4">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
