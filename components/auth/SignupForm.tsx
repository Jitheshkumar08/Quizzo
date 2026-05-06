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

      router.push("/login?registered=true");
    } catch {
      setError("Network error. Please check your connection and try again.");
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
    <div className="w-full max-w-[440px] mx-auto pb-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-[32px] font-bold text-[#1A1A1A] mb-2 tracking-tight leading-tight">Create account</h1>
        <p className="text-[#6B6863] text-[15px] font-medium">Join MCQify and start learning</p>
      </div>

      {/* Form Card with Glassmorphism */}
      <div className="bg-[#F4EFE6]/70 backdrop-blur-2xl rounded-[32px] p-6 sm:p-8 shadow-[0_20px_40px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.05)] border border-white/80 relative overflow-hidden">
        {/* Glossy highlight inside card */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-[32px]"></div>

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
