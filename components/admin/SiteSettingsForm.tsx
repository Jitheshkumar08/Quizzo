"use client";

import { useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Music2, Play, Save, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import type { CelebrationSoundAsset } from "@/lib/celebration-sounds";

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
  availableSounds,
  initialCelebrationSoundEnabled,
  initialCelebrationSoundPath,
}: {
  availableSounds: CelebrationSoundAsset[];
  initialCelebrationSoundEnabled: boolean;
  initialCelebrationSoundPath: string;
}) {
  const [enabled, setEnabled] = useState(initialCelebrationSoundEnabled);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedSoundPath, setSelectedSoundPath] = useState(initialCelebrationSoundPath);
  const [savedSoundPath, setSavedSoundPath] = useState(initialCelebrationSoundPath);
  const [previewingPath, setPreviewingPath] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

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

  async function saveCelebrationSound() {
    if (saving || selectedSoundPath === savedSoundPath) return;

    const previousSavedPath = savedSoundPath;
    setSavedSoundPath(selectedSoundPath);
    setSaving(true);

    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ celebrationSoundPath: selectedSoundPath }),
      });
      const data: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSavedSoundPath(previousSavedPath);
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Could not update celebration sound";
        toast.error(message);
        return;
      }

      toast.success("Celebration sound saved");
    } catch {
      setSavedSoundPath(previousSavedPath);
      toast.error("Network error while updating sound");
    } finally {
      setSaving(false);
    }
  }

  function previewSound(soundPath: string) {
    if (previewingPath === soundPath && previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
      previewAudioRef.current = null;
      setPreviewingPath(null);
      return;
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.currentTime = 0;
    }

    setPreviewingPath(soundPath);
    const audio = new Audio(soundPath);
    previewAudioRef.current = audio;
    audio.volume = 0.7;
    audio.currentTime = 0;
    audio.onended = () => {
      if (previewAudioRef.current === audio) {
        previewAudioRef.current = null;
      }
      setPreviewingPath((current) => (current === soundPath ? null : current));
    };
    audio.onerror = () => {
      if (previewAudioRef.current === audio) {
        previewAudioRef.current = null;
      }
      setPreviewingPath((current) => (current === soundPath ? null : current));
      toast.error("Could not preview this sound");
    };
    void audio.play().catch(() => {
      if (previewAudioRef.current === audio) {
        previewAudioRef.current = null;
      }
      setPreviewingPath((current) => (current === soundPath ? null : current));
      toast.error("Browser blocked sound preview");
    });
  }

  const selectedSound = availableSounds.find((sound) => sound.path === savedSoundPath);
  const hasUnsavedSound = selectedSoundPath !== savedSoundPath;

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/82 p-5 shadow-[0_18px_48px_rgba(44,42,40,0.08)] ring-1 ring-[#E8E2D8]/80 backdrop-blur-2xl sm:p-6">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />
      <div className="relative z-10 space-y-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
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
              <p className="mt-2 text-xs font-bold text-slate-500">
                Current file: <span className="text-slate-800">{selectedSound?.fileName ?? savedSoundPath}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className="inline-flex h-14 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-violet-100 bg-violet-50 px-4 text-sm font-black text-violet-700 shadow-sm transition hover:bg-violet-100"
              aria-expanded={expanded}
            >
              Sounds
              <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
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
        </div>

        {expanded && (
          <div className="rounded-[22px] border border-[#E8E2D8] bg-[#FFFDF9]/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8C6D50]">Available sounds</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">Preview a file, select it, then save it as the celebration sound.</p>
              </div>
              <button
                type="button"
                onClick={saveCelebrationSound}
                disabled={!hasUnsavedSound || saving}
                className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Sound
              </button>
            </div>

            {availableSounds.length === 0 ? (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                No audio files found in public/assets.
              </div>
            ) : (
              <div className="grid gap-2">
                {availableSounds.map((sound) => {
                  const selected = selectedSoundPath === sound.path;
                  const saved = savedSoundPath === sound.path;

                  return (
                    <label
                      key={sound.path}
                      className={`flex cursor-pointer flex-col gap-3 rounded-2xl border px-4 py-3 transition sm:flex-row sm:items-center sm:justify-between ${
                        selected ? "border-violet-200 bg-violet-50/80" : "border-slate-200 bg-white/80 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${
                            selected ? "border-violet-200 bg-white text-violet-700" : "border-slate-200 bg-slate-50 text-slate-500"
                          }`}
                        >
                          {selected ? <Check className="h-4 w-4" /> : <Music2 className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black text-slate-900">{sound.fileName}</span>
                          <span className="block truncate text-xs font-semibold text-slate-500">
                            {sound.path}
                            {saved ? " • saved" : ""}
                          </span>
                        </span>
                      </span>
                      <span className="flex flex-shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            previewSound(sound.path);
                          }}
                          className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                        >
                          {previewingPath === sound.path ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                          {previewingPath === sound.path ? "Stop" : "Preview"}
                        </button>
                        <input
                          type="radio"
                          name="celebrationSoundPath"
                          checked={selected}
                          onChange={() => setSelectedSoundPath(sound.path)}
                          className="h-4 w-4 accent-violet-600"
                          aria-label={`Select ${sound.fileName}`}
                        />
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
