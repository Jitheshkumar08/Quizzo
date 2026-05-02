"use client";

import { useState, useEffect } from "react";
import { Loader2, Save, User as UserIcon, Mail, Lock, CheckCircle2, XCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SettingsForm() {
  const { data: session, update } = useSession();
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
      setUsernameStatus('idle');
      return;
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
      } catch (err) {
        setUsernameStatus('unavailable');
      }
    }, 800);

    return () => clearTimeout(delayDebounceFn);
  }, [form.username, originalData.username]);

  useEffect(() => {
    if (!form.email || form.email === originalData.email) {
      setEmailStatus('idle');
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
      if (!isValidEmail) {
        setEmailStatus('unavailable');
        return;
      }

      setEmailStatus('checking');
      try {
        const res = await fetch('/api/user/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'email', value: form.email })
        });
        const data = await res.json();
        setEmailStatus(data.available ? 'available' : 'unavailable');
        
        if (data.available) setTimeout(() => setEmailStatus('idle'), 2500);
      } catch (err) {
        setEmailStatus('unavailable');
      }
    }, 800);

    return () => clearTimeout(delayDebounceFn);
  }, [form.email, originalData.email]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus === 'unavailable' || emailStatus === 'unavailable') {
      setMessage({ type: 'error', text: 'Please fix the errors before saving.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile' });
      } else {
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        
        setOriginalData({ username: form.username, email: form.email });
        setForm(prev => ({ ...prev, currentPassword: "", newPassword: "" }));
        
        await update({ name: form.fullName, username: form.username, email: form.email });
        router.refresh();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8 text-center mt-4">
        <h1 className="text-3xl font-bold text-[#2C2A28] mb-2 tracking-tight">Account Settings</h1>
        <p className="text-[#918B80] font-medium">Update your profile, email, and password.</p>
      </div>

      <div className="bg-[#F4EFE6]/70 backdrop-blur-2xl rounded-[32px] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.04)] border border-white/80 relative overflow-hidden">
        {/* Glossy highlight inside card */}
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-[32px]"></div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                className="w-full px-5 py-4 rounded-full bg-white/40 border border-white/80 text-[#2C2A28] placeholder-[#A8A296] focus:outline-none focus:bg-white/90 focus:border-[#8C5D3E] focus:ring-[4px] focus:ring-[#8C5D3E]/15 transition-all duration-300 text-[15px] shadow-[inset_0_2px_6px_rgba(0,0,0,0.02)] backdrop-blur-xl font-medium"
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
                className="w-full px-5 py-4 rounded-full bg-white/40 border border-white/80 text-[#2C2A28] placeholder-[#A8A296] focus:outline-none focus:bg-white/90 focus:border-[#8C5D3E] focus:ring-[4px] focus:ring-[#8C5D3E]/15 transition-all duration-300 text-[15px] shadow-[inset_0_2px_6px_rgba(0,0,0,0.02)] backdrop-blur-xl font-medium"
              />
            </div>
          </div>

          <div className="flex flex-col group relative">
            <div className="flex items-center justify-between ml-2 mb-2">
              <label className="text-[14px] font-bold text-[#2C2A28] transition-colors group-focus-within:text-[#8C5D3E] flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-[#918B80] group-focus-within:text-[#8C5D3E] transition-colors" />
                Email Address
              </label>
              {emailStatus === 'checking' && <span className="text-[12px] font-bold text-[#8C5D3E] flex items-center gap-1 animate-pulse"><Loader2 className="w-3 h-3 animate-spin"/> Checking</span>}
              {emailStatus === 'available' && <span className="text-[12px] font-bold text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Available</span>}
              {emailStatus === 'unavailable' && <span className="text-[12px] font-bold text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3"/> Invalid Email</span>}
            </div>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="johndoe@example.com"
              className="w-full px-5 py-4 rounded-full bg-white/40 border border-white/80 text-[#2C2A28] placeholder-[#A8A296] focus:outline-none focus:bg-white/90 focus:border-[#8C5D3E] focus:ring-[4px] focus:ring-[#8C5D3E]/15 transition-all duration-300 text-[15px] shadow-[inset_0_2px_6px_rgba(0,0,0,0.02)] backdrop-blur-xl font-medium"
            />
          </div>

          <div className="border-t border-[#E9E4DC]/60 pt-6 pb-2">
            <h3 className="text-[16px] font-bold text-[#2C2A28] mb-1">Change Password</h3>
            <p className="text-[13px] text-[#918B80] mb-4">Leave fields blank if you don&apos;t want to change your password.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col group">
                <label className="text-[14px] font-bold text-[#2C2A28] ml-2 mb-2 transition-colors group-focus-within:text-[#8C5D3E] flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-[#918B80] group-focus-within:text-[#8C5D3E] transition-colors" />
                  Current Password
                </label>
                <input
                  name="currentPassword"
                  type="password"
                  value={form.currentPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-5 py-4 rounded-full bg-white/40 border border-white/80 text-[#2C2A28] placeholder-[#A8A296] focus:outline-none focus:bg-white/90 focus:border-[#8C5D3E] focus:ring-[4px] focus:ring-[#8C5D3E]/15 transition-all duration-300 text-[15px] shadow-[inset_0_2px_6px_rgba(0,0,0,0.02)] backdrop-blur-xl font-medium"
                />
              </div>
              <div className="flex flex-col group">
                <label className="text-[14px] font-bold text-[#2C2A28] ml-2 mb-2 transition-colors group-focus-within:text-[#8C5D3E] flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-[#918B80] group-focus-within:text-[#8C5D3E] transition-colors" />
                  New Password
                </label>
                <input
                  name="newPassword"
                  type="password"
                  value={form.newPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-5 py-4 rounded-full bg-white/40 border border-white/80 text-[#2C2A28] placeholder-[#A8A296] focus:outline-none focus:bg-white/90 focus:border-[#8C5D3E] focus:ring-[4px] focus:ring-[#8C5D3E]/15 transition-all duration-300 text-[15px] shadow-[inset_0_2px_6px_rgba(0,0,0,0.02)] backdrop-blur-xl font-medium"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="py-4 px-8 rounded-full font-bold text-[#FDFBFA] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 bg-[#2C2A28] hover:bg-[#1A1816] shadow-[0_8px_20px_rgba(44,42,40,0.2)] hover:shadow-[0_12px_24px_rgba(44,42,40,0.3)] hover:-translate-y-0.5 active:translate-y-0 text-[16px] tracking-wide"
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