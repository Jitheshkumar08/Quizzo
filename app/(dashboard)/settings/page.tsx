"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Loader2, Save, User as UserIcon, Mail, Lock, CheckCircle2, XCircle, MailCheck, RefreshCw } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import PasswordInput from "@/components/ui/PasswordInput";

export default function SettingsForm() {
  const { update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [form, setForm] = useState({
    username: "",
    fullName: "",
    email: "",
    currentPassword: "",
    newPassword: ""
  });

  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'available' | 'unavailable'>('idle');
  const [emailVerificationEmail, setEmailVerificationEmail] = useState("");
  const [emailOtpCode, setEmailOtpCode] = useState("");
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [emailResendSeconds, setEmailResendSeconds] = useState(0);
  
  // Track original loaded data to prevent unnecessary API checks on load
  const [originalData, setOriginalData] = useState({ username: "", email: "" });

  useEffect(() => {
    // Load fresh user data directly from DB to prevent stale session cookies
    const loadUser = async () => {
      try {
        const res = await fetch('/api/user/me');
        if (res.ok) {
          const data = await res.json();
          setForm(prev => ({
            ...prev,
            username: data.username || "",
            fullName: data.fullName || "",
            email: data.email || ""
          }));
          setOriginalData({
            username: data.username || "",
            email: data.email || ""
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!form.username || form.username === originalData.username) {
      const timer = window.setTimeout(() => setUsernameStatus('idle'), 0);
      return () => window.clearTimeout(timer);
    }
    
    const delayDebounceFn = setTimeout(async () => {
      if (form.username.length < 3 || ['admin', 'root'].includes(form.username.toLowerCase())) {
        setUsernameStatus('unavailable');
        return;
      }
      
      setUsernameStatus('checking');
      try {
        const res = await fetch('/api/user/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'username', value: form.username })
        });
        const data = await res.json();
        setUsernameStatus(data.available ? 'available' : 'unavailable');
        
        if (data.available) setTimeout(() => setUsernameStatus('idle'), 2500);
      } catch {
        setUsernameStatus('unavailable');
      }
    }, 800);

    return () => clearTimeout(delayDebounceFn);
  }, [form.username, originalData.username]);

  useEffect(() => {
    if (!form.email || form.email === originalData.email) {
      const timer = window.setTimeout(() => setEmailStatus('idle'), 0);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => setEmailStatus('unavailable'), 0);
    return () => window.clearTimeout(timer);
  }, [form.email, originalData.email]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setMessage(null);
    if (emailVerificationEmail) {
      setEmailVerificationEmail("");
      setEmailOtpCode("");
      setEmailResendSeconds(0);
    }
  };

  function startEmailResendTimer() {
    setEmailResendSeconds(30);
    window.clearInterval((window as typeof window & { quizzoEmailChangeTimer?: number }).quizzoEmailChangeTimer);
    const timer = window.setInterval(() => {
      setEmailResendSeconds((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    (window as typeof window & { quizzoEmailChangeTimer?: number }).quizzoEmailChangeTimer = timer;
  }

  async function submitSettingsForVerification() {
    const res = await fetch('/api/user/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus === 'unavailable' || emailStatus === 'unavailable') {
      setMessage({ type: 'error', text: 'Please fix the errors before saving.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { res, data } = await submitSettingsForVerification();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      } else if (data.emailVerificationRequired) {
        const pendingEmail = typeof data.email === "string" ? data.email : form.email;
        setEmailVerificationEmail(pendingEmail);
        setEmailOtpCode("");
        setMessage({ type: 'success', text: data.message || `A verification code was sent to ${pendingEmail}.` });
        startEmailResendTimer();
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        
        setOriginalData({ username: form.username, email: form.email });
        setForm(prev => ({ ...prev, currentPassword: "", newPassword: "" }));
        
        await update({ name: form.fullName, username: form.username, email: form.email });
        router.refresh();
      }
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const resendEmailVerificationCode = async () => {
    setResendingEmail(true);
    setMessage(null);
    try {
      const { res, data } = await submitSettingsForVerification();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Could not resend the verification code.' });
        return;
      }

      const pendingEmail = typeof data.email === "string" ? data.email : emailVerificationEmail;
      setEmailVerificationEmail(pendingEmail);
      setEmailOtpCode("");
      setMessage({ type: 'success', text: data.message || `A new verification code was sent to ${pendingEmail}.` });
      startEmailResendTimer();
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setResendingEmail(false);
    }
  };

  const verifyEmailChange = async () => {
    setMessage(null);

    if (!/^\d{6}$/.test(emailOtpCode.trim())) {
      setMessage({ type: 'error', text: 'Enter the 6-digit verification code.' });
      return;
    }

    setVerifyingEmail(true);
    try {
      const res = await fetch('/api/user/settings/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVerificationEmail, code: emailOtpCode.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Could not verify your email.' });
        return;
      }

      const updatedUser = data.user || {};
      const nextUsername = typeof updatedUser.username === "string" ? updatedUser.username : form.username;
      const nextFullName = typeof updatedUser.fullName === "string" ? updatedUser.fullName : form.fullName;
      const nextEmail = typeof updatedUser.email === "string" ? updatedUser.email : form.email;

      setForm(prev => ({
        ...prev,
        username: nextUsername,
        fullName: nextFullName,
        email: nextEmail,
        currentPassword: "",
        newPassword: "",
      }));
      setOriginalData({ username: nextUsername, email: nextEmail });
      setEmailVerificationEmail("");
      setEmailOtpCode("");
      setEmailResendSeconds(0);
      setMessage({ type: 'success', text: data.message || 'Email verified and profile updated successfully.' });

      await update({ name: nextFullName, username: nextUsername, email: nextEmail });
      router.refresh();
    } catch {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setVerifyingEmail(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6 text-center mt-2">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm border border-[#E8E2D8]">
          <UserIcon className="w-6 h-6 text-[#8C5D3E]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1E1C1A] mb-2 tracking-tight">Account Settings</h1>
        <p className="text-[#6B6357] font-medium text-sm sm:text-base">Update your profile, email, and password.</p>
      </div>

      <div className="bg-white/[0.88] backdrop-blur-2xl rounded-[28px] p-5 sm:p-7 shadow-[0_20px_55px_rgba(44,42,40,0.10),inset_0_1px_0_rgba(255,255,255,0.95)] border border-white/95 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#FFFDF8] to-transparent pointer-events-none" />
        <div className="absolute -top-20 -right-16 h-44 w-44 rounded-full bg-[#F4EFE6] blur-3xl opacity-80 pointer-events-none" />

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col group relative">
              <div className="flex items-center justify-between ml-2 mb-2">
                <label className="text-[14px] font-bold text-[#2C2A28] transition-colors group-focus-within:text-[#8C5D3E] flex items-center gap-1.5">
                  <UserIcon className="w-4 h-4 text-[#918B80] group-focus-within:text-[#8C5D3E] transition-colors" />
                  Username
                </label>
                {usernameStatus === 'checking' && <span className="text-[12px] font-bold text-[#8C5D3E] flex items-center gap-1 animate-pulse"><Loader2 className="w-3 h-3 animate-spin"/> Checking</span>}
                {usernameStatus === 'available' && <span className="text-[12px] font-bold text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Available</span>}
                {usernameStatus === 'unavailable' && <span className="text-[12px] font-bold text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3"/> Unavailable</span>}
              </div>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="johndoe"
                className="w-full px-5 py-3.5 rounded-2xl bg-[#FFFDF9] border border-[#DED6CA] text-[#2C2A28] placeholder-[#A8A296] focus:outline-none focus:bg-white focus:border-[#8C5D3E] focus:ring-[4px] focus:ring-[#8C5D3E]/15 transition-all duration-300 text-[15px] shadow-[inset_0_1px_3px_rgba(44,42,40,0.035)] font-medium"
              />
            </div>

            <div className="flex flex-col group">
              <label className="text-[14px] font-bold text-[#2C2A28] ml-2 mb-2 transition-colors group-focus-within:text-[#8C5D3E] flex items-center gap-1.5">
                <UserIcon className="w-4 h-4 text-[#918B80] group-focus-within:text-[#8C5D3E] transition-colors" />
                Full Name
              </label>
              <input
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full px-5 py-3.5 rounded-2xl bg-[#FFFDF9] border border-[#DED6CA] text-[#2C2A28] placeholder-[#A8A296] focus:outline-none focus:bg-white focus:border-[#8C5D3E] focus:ring-[4px] focus:ring-[#8C5D3E]/15 transition-all duration-300 text-[15px] shadow-[inset_0_1px_3px_rgba(44,42,40,0.035)] font-medium"
              />
            </div>
          </div>

          <div className="flex flex-col group relative">
            <div className="flex items-center justify-between ml-2 mb-2">
              <label className="text-[14px] font-bold text-[#2C2A28] transition-colors group-focus-within:text-[#8C5D3E] flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-[#918B80] group-focus-within:text-[#8C5D3E] transition-colors" />
                Email Address
              </label>
              <span className="text-[12px] font-bold text-[#918B80] flex items-center gap-1">
                <Lock className="w-3 h-3" /> Locked
              </span>
            </div>
            <input
              name="email"
              type="email"
              value={form.email}
              readOnly
              disabled
              placeholder="johndoe@example.com"
              className="w-full cursor-not-allowed px-5 py-3.5 rounded-2xl bg-[#F4EFE6]/70 border border-[#DED6CA] text-[#6B6357] placeholder-[#A8A296] focus:outline-none transition-all duration-300 text-[15px] shadow-[inset_0_1px_3px_rgba(44,42,40,0.035)] font-medium"
            />
            <p className="mt-2 ml-2 text-[12px] font-semibold text-[#918B80]">
              Email changes are temporarily disabled.
            </p>
          </div>

          {emailVerificationEmail && (
            <div className="rounded-[26px] border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white p-1 shadow-[0_16px_34px_rgba(16,185,129,0.10)]">
              <div className="rounded-[22px] border border-white/90 bg-white/82 p-4 backdrop-blur-xl sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-[0_10px_22px_rgba(16,185,129,0.15)] ring-1 ring-emerald-100">
                      <MailCheck className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[16px] font-black text-[#2C2A28]">Verify new email</p>
                      <p className="mt-1 text-[13px] font-semibold leading-relaxed text-[#6B6863]">
                        Enter the 6-digit code sent to <span className="font-black text-[#2C2A28] break-all">{emailVerificationEmail}</span>.
                      </p>
                      <div className="mt-3 inline-flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-[12px] font-bold text-emerald-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Code expires in 10 minutes
                      </div>
                    </div>
                  </div>

                  <div className="w-full lg:w-[280px]">
                    <div className="relative rounded-[22px] border border-[#E5DCD0] bg-white/80 p-2.5 shadow-[0_10px_24px_rgba(44,42,40,0.08)] transition-all focus-within:border-emerald-300 focus-within:ring-[5px] focus-within:ring-emerald-100">
                      <input
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={emailOtpCode}
                        onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        onPaste={(e) => {
                          e.preventDefault();
                          setEmailOtpCode(e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6));
                        }}
                        aria-label="Email verification code"
                        className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
                      />
                      <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
                        {Array.from({ length: 6 }).map((_, index) => {
                          const digit = emailOtpCode[index] ?? "";
                          return (
                            <div
                              key={index}
                              className={`flex aspect-square min-h-[36px] items-center justify-center rounded-xl border text-[18px] font-black shadow-sm transition-all ${digit ? "border-violet-200 bg-violet-50 text-[#2C2A28]" : "border-[#D8CDEB] bg-white text-[#B9B1A7]"}`}
                            >
                              {digit}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                      <button
                        type="button"
                        onClick={verifyEmailChange}
                        disabled={verifyingEmail}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#2C2A28] px-4 text-[13px] font-black text-white shadow-sm transition-all hover:bg-[#1A1816] disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-3 lg:col-span-1"
                      >
                        {verifyingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
                        Verify and save
                      </button>
                      <button
                        type="button"
                        onClick={resendEmailVerificationCode}
                        disabled={emailResendSeconds > 0 || resendingEmail}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#E3D8CA] bg-white/70 px-4 text-[12px] font-black text-[#2C2A28] shadow-sm transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2 lg:col-span-1"
                      >
                        {resendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 text-emerald-600" />}
                        {emailResendSeconds > 0 ? `Resend in ${emailResendSeconds}s` : "Resend code"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailVerificationEmail("");
                          setEmailOtpCode("");
                          setEmailResendSeconds(0);
                          setMessage(null);
                        }}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#E3D8CA] bg-white/50 px-4 text-[12px] font-black text-[#8C5D3E] shadow-sm transition-all hover:bg-white"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-[24px] border border-[#E8E2D8] bg-[#F8F3EA]/75 p-4 sm:p-5">
            <h3 className="text-[16px] font-bold text-[#2C2A28] mb-1">Change Password</h3>
            <p className="text-[13px] text-[#6B6357] mb-4 font-medium">Leave fields blank if you don&apos;t want to change your password.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col group">
                <label className="text-[14px] font-bold text-[#2C2A28] ml-2 mb-2 transition-colors group-focus-within:text-[#8C5D3E] flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-[#918B80] group-focus-within:text-[#8C5D3E] transition-colors" />
                  Current Password
                </label>
                <PasswordInput
                  name="currentPassword"
                  value={form.currentPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-5 py-3.5 rounded-2xl bg-[#FFFDF9] border border-[#DED6CA] text-[#2C2A28] placeholder-[#A8A296] focus:outline-none focus:bg-white focus:border-[#8C5D3E] focus:ring-[4px] focus:ring-[#8C5D3E]/15 transition-all duration-300 text-[15px] shadow-[inset_0_1px_3px_rgba(44,42,40,0.035)] font-medium"
                />
              </div>
              <div className="flex flex-col group">
                <label className="text-[14px] font-bold text-[#2C2A28] ml-2 mb-2 transition-colors group-focus-within:text-[#8C5D3E] flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-[#918B80] group-focus-within:text-[#8C5D3E] transition-colors" />
                  New Password
                </label>
                <PasswordInput
                  name="newPassword"
                  value={form.newPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="w-full px-5 py-3.5 rounded-2xl bg-[#FFFDF9] border border-[#DED6CA] text-[#2C2A28] placeholder-[#A8A296] focus:outline-none focus:bg-white focus:border-[#8C5D3E] focus:ring-[4px] focus:ring-[#8C5D3E]/15 transition-all duration-300 text-[15px] shadow-[inset_0_1px_3px_rgba(44,42,40,0.035)] font-medium"
                />
              </div>
            </div>
          </div>

          {message && (
            <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
              {message.text}
            </div>
          )}

          <div className="pt-1 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto py-3 px-7 rounded-full font-bold text-[#FDFBFA] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-[#2C2A28] hover:bg-[#1A1816] shadow-[0_8px_20px_rgba(44,42,40,0.2)] hover:shadow-[0_12px_24px_rgba(44,42,40,0.3)] hover:-translate-y-0.5 active:translate-y-0 text-[15px]"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
              ) : (
                <>Save Changes <Save className="w-4 h-4 ml-1" /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
