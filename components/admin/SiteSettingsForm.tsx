"use client";

import { useState } from "react";
import { Loader2, Music2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

function CelebrationSoundSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="site-setting-switch-button" aria-label={checked ? "Turn celebration sound off" : "Turn celebration sound on"}>
      <span className="site-setting-switch-outer">
        <input
          className="site-setting-switch-input"
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        <span className="site-setting-switch-body">
          <span className="site-setting-switch-toggle" />
          <span className="site-setting-switch-indicator" />
        </span>
      </span>
    </label>
  );
}

export default function SiteSettingsForm({
  initialCelebrationSoundEnabled,
}: {
  initialCelebrationSoundEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialCelebrationSoundEnabled);
  const [saving, setSaving] = useState(false);

  async function updateCelebrationSound(nextEnabled: boolean) {
    if (saving) return;

    const previous = enabled;
    setEnabled(nextEnabled);
    setSaving(true);

    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ celebrationSoundEnabled: nextEnabled }),
      });
      const data: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        setEnabled(previous);
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Could not update site setting";
        toast.error(message);
        return;
      }

      if (nextEnabled) {
        toast.success("Celebration sound enabled");
      } else {
        toast.error("Celebration sound disabled");
      }
    } catch {
      setEnabled(previous);
      toast.error("Network error while updating setting");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/82 p-5 shadow-[0_18px_48px_rgba(44,42,40,0.08)] ring-1 ring-[#E8E2D8]/80 backdrop-blur-2xl sm:p-6">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
            <Music2 className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8C6D50]">Quiz completion</p>
            <h2 className="mt-1 text-xl font-black text-[#1F1B19]">Celebration sound</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-slate-600">
              Controls whether the congratulations sound plays when students reach the high-score celebration. Confetti stays active.
            </p>
          </div>
        </div>

        <div
          className={`inline-flex min-h-16 min-w-[228px] items-center justify-between gap-4 rounded-2xl border px-4 py-2 text-sm font-black shadow-sm transition-all ${
            enabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"
          } ${saving ? "opacity-75" : ""}`}
        >
          <span className="inline-flex items-center gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : enabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
            {enabled ? "Sound on" : "Sound off"}
          </span>
          <CelebrationSoundSwitch checked={enabled} disabled={saving} onChange={updateCelebrationSound} />
        </div>
      </div>
    </section>
  );
}
