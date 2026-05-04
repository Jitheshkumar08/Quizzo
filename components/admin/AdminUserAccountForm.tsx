"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Lock, Mail, Save, Shield, User, XCircle } from "lucide-react";

type Role = "STUDENT" | "INSTRUCTOR" | "ADMIN";

interface EditableUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: Role;
}

const roles: Array<{ value: Role; label: string }> = [
  { value: "STUDENT", label: "Student" },
  { value: "INSTRUCTOR", label: "Instructor" },
  { value: "ADMIN", label: "Admin" },
];

type AvailabilityStatus = "idle" | "checking" | "available" | "unavailable";

export default function AdminUserAccountForm({
  user,
  currentUserId,
}: {
  user: EditableUser;
  currentUserId: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    role: user.role,
    newPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<AvailabilityStatus>("idle");
  const [emailStatus, setEmailStatus] = useState<AvailabilityStatus>("idle");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isSelf = user.id === currentUserId;

  function updateField(name: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setMessage(null);
  }

  useEffect(() => {
    const username = form.username.trim();
    if (!username || username === user.username) {
      const timer = window.setTimeout(() => setUsernameStatus("idle"), 0);
      return () => window.clearTimeout(timer);
    }

    if (username.length < 3 || ["admin", "root"].includes(username.toLowerCase())) {
      const timer = window.setTimeout(() => setUsernameStatus("unavailable"), 0);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(async () => {
      setUsernameStatus("checking");
      try {
        const res = await fetch("/api/user/check-availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ field: "username", value: username, excludeUserId: user.id }),
        });
        const data = await res.json().catch(() => ({}));
        setUsernameStatus(data.available ? "available" : "unavailable");
      } catch {
        setUsernameStatus("unavailable");
      }
    }, 600);

    return () => window.clearTimeout(timer);
  }, [form.username, user.id, user.username]);

  useEffect(() => {
    const email = form.email.trim().toLowerCase();
    if (!email || email === user.email.toLowerCase()) {
      const timer = window.setTimeout(() => setEmailStatus("idle"), 0);
      return () => window.clearTimeout(timer);
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const timer = window.setTimeout(() => setEmailStatus("unavailable"), 0);
      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(async () => {
      setEmailStatus("checking");
      try {
        const res = await fetch("/api/user/check-availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ field: "email", value: email, excludeUserId: user.id }),
        });
        const data = await res.json().catch(() => ({}));
        setEmailStatus(data.available ? "available" : "unavailable");
      } catch {
        setEmailStatus("unavailable");
      }
    }, 600);

    return () => window.clearTimeout(timer);
  }, [form.email, user.email, user.id]);

  const hasBlockingAvailability =
    usernameStatus === "checking" ||
    usernameStatus === "unavailable" ||
    emailStatus === "checking" ||
    emailStatus === "unavailable";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (hasBlockingAvailability) {
      setMessage({ type: "error", text: "Please fix availability checks before saving." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const payload = {
        userId: user.id,
        fullName: form.fullName,
        username: form.username,
        email: form.email,
        role: form.role,
        ...(form.newPassword.trim() ? { newPassword: form.newPassword } : {}),
      };

      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage({ type: "error", text: typeof data.error === "string" ? data.error : "Failed to update user" });
        return;
      }

      setForm((prev) => ({
        ...prev,
        fullName: data.fullName ?? prev.fullName,
        username: data.username ?? prev.username,
        email: data.email ?? prev.email,
        role: data.role ?? prev.role,
        newPassword: "",
      }));
      setUsernameStatus("idle");
      setEmailStatus("idle");
      setMessage({ type: "success", text: "Account updated successfully." });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "Network error while updating account." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-[24px] border border-[#E8E2D8] bg-white/75 p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-2xl bg-[#F0EBE2] flex items-center justify-center">
          <Shield className="w-5 h-5 text-[#8C6D50]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#1E1C1A]">Account Settings</h2>
          <p className="text-xs font-medium text-[#918B80]">Edit profile, access, and password</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[12px] font-bold text-[#6B6357] flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[#918B80]" />
            Full Name
          </span>
          <input
            value={form.fullName}
            onChange={(e) => updateField("fullName", e.target.value)}
            className="w-full rounded-2xl border border-[#E8E2D8] bg-[#FAF7F3]/70 px-4 py-3 text-sm font-medium text-[#2C2A28] outline-none transition focus:border-[#8C6D50] focus:bg-white focus:ring-4 focus:ring-[#8C6D50]/10"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[12px] font-bold text-[#6B6357] flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#918B80]" />
              Username
            </span>
            <AvailabilityBadge status={usernameStatus} availableText="Available" unavailableText="Taken" />
          </span>
          <input
            value={form.username}
            onChange={(e) => updateField("username", e.target.value)}
            className="w-full rounded-2xl border border-[#E8E2D8] bg-[#FAF7F3]/70 px-4 py-3 text-sm font-medium text-[#2C2A28] outline-none transition focus:border-[#8C6D50] focus:bg-white focus:ring-4 focus:ring-[#8C6D50]/10"
          />
        </label>

        <label className="flex flex-col gap-2 sm:col-span-2">
          <span className="text-[12px] font-bold text-[#6B6357] flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#918B80]" />
              Email
            </span>
            <AvailabilityBadge status={emailStatus} availableText="Available" unavailableText="Unavailable" />
          </span>
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            className="w-full rounded-2xl border border-[#E8E2D8] bg-[#FAF7F3]/70 px-4 py-3 text-sm font-medium text-[#2C2A28] outline-none transition focus:border-[#8C6D50] focus:bg-white focus:ring-4 focus:ring-[#8C6D50]/10"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[12px] font-bold text-[#6B6357] flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#918B80]" />
            Role
          </span>
          <select
            value={form.role}
            disabled={isSelf}
            onChange={(e) => updateField("role", e.target.value as Role)}
            className="w-full rounded-2xl border border-[#E8E2D8] bg-[#FAF7F3]/70 px-4 py-3 text-sm font-bold text-[#2C2A28] outline-none transition focus:border-[#8C6D50] focus:bg-white focus:ring-4 focus:ring-[#8C6D50]/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {roles.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          {isSelf && <span className="text-[11px] font-medium text-[#918B80]">You cannot change your own role.</span>}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[12px] font-bold text-[#6B6357] flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#918B80]" />
            New Password
          </span>
          <input
            type="password"
            value={form.newPassword}
            onChange={(e) => updateField("newPassword", e.target.value)}
            placeholder="Leave blank to keep current"
            className="w-full rounded-2xl border border-[#E8E2D8] bg-[#FAF7F3]/70 px-4 py-3 text-sm font-medium text-[#2C2A28] outline-none transition placeholder:text-[#B0A89E] focus:border-[#8C6D50] focus:bg-white focus:ring-4 focus:ring-[#8C6D50]/10"
          />
        </label>
      </div>

      {message && (
        <div
          className={`mt-5 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium ${
            message.type === "success"
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-rose-100 bg-rose-50 text-rose-700"
          }`}
        >
          {message.type === "success" && <CheckCircle2 className="w-4 h-4" />}
          {message.text}
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="submit"
          disabled={loading || hasBlockingAvailability}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2C2A28] px-6 py-3 text-sm font-bold text-[#FDFBFA] shadow-[0_8px_20px_rgba(44,42,40,0.18)] transition hover:-translate-y-0.5 hover:bg-[#1A1816] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>
    </form>
  );
}

function AvailabilityBadge({
  status,
  availableText,
  unavailableText,
}: {
  status: AvailabilityStatus;
  availableText: string;
  unavailableText: string;
}) {
  if (status === "idle") return null;

  if (status === "checking") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8C6D50]">
        <Loader2 className="w-3 h-3 animate-spin" />
        Checking
      </span>
    );
  }

  if (status === "available") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
        <CheckCircle2 className="w-3 h-3" />
        {availableText}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
      <XCircle className="w-3 h-3" />
      {unavailableText}
    </span>
  );
}
