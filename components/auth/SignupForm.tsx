"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";

export default function SignupForm() {
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          username: form.username,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Signup failed. Please try again.");
        return;
      }

      router.push("/login?registered=true");
    } finally {
      setLoading(false);
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
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Create account</h1>
        <p className="text-white/60">Join MCQify as a student</p>
      </div>

      {/* Form */}
      <div className="bg-[#121214]/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/[0.05] relative overflow-hidden">
        {/* Subtle inner gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <label htmlFor={field.name} className="text-sm font-medium text-white/70 pl-1">
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
                  className="w-full px-4 py-3.5 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/80 focus:ring-4 focus:ring-purple-500/10 transition-all duration-300"
                />
                {field.type === "password" && field.name === "password" && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-white/40 hover:text-white/80 transition-colors rounded-md"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}

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
              <><Loader2 className="w-5 h-5 animate-spin" /> Creating account...</>
            ) : (
              <><UserPlus className="w-5 h-5" /> Create account</>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-white/50 mt-6 relative z-10">
          Already have an account?{" "}
          <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors hover:underline underline-offset-4">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
