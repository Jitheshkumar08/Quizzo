"use client";

import { useRef, useState } from "react";
import { ChevronDown, Loader2, Music2, Play, Plus, Save, Sparkles, Trash2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import type { CelebrationSoundAsset } from "@/lib/celebration-sounds";
import type { CelebrationRule } from "@/lib/site-config";

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

function normalizeRuleSoundPaths({
  fallbackSoundPath,
  rules,
  sounds,
}: {
  fallbackSoundPath: string;
  rules: CelebrationRule[];
  sounds: CelebrationSoundAsset[];
}) {
  const validPaths = new Set(sounds.map((sound) => sound.path));

  return rules.map((rule) => ({
    ...rule,
    soundPath: validPaths.has(rule.soundPath) ? rule.soundPath : fallbackSoundPath,
  }));
}

export default function SiteSettingsForm({
  availableSounds,
  initialCelebrationRules,
  initialCelebrationSoundEnabled,
  initialCelebrationSoundPath,
}: {
  availableSounds: CelebrationSoundAsset[];
  initialCelebrationRules: CelebrationRule[];
  initialCelebrationSoundEnabled: boolean;
  initialCelebrationSoundPath: string;
}) {
  const fallbackSoundPath = availableSounds[0]?.path ?? initialCelebrationSoundPath;
  const normalizedInitialRules = normalizeRuleSoundPaths({
    fallbackSoundPath,
    rules: initialCelebrationRules,
    sounds: availableSounds,
  });
  const [enabled, setEnabled] = useState(initialCelebrationSoundEnabled);
  const [expanded, setExpanded] = useState(false);
  const [soundLibraryExpanded, setSoundLibraryExpanded] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState(normalizedInitialRules);
  const [savedRules, setSavedRules] = useState(normalizedInitialRules);
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

  const hasUnsavedRules = JSON.stringify(rules) !== JSON.stringify(savedRules);

  function updateRule(ruleId: string, patch: Partial<CelebrationRule>) {
    setRules((current) =>
      current.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              ...patch,
            }
          : rule
      )
    );
  }

  function addRule() {
    const orderedRules = [...rules].sort((a, b) => a.maxScore - b.maxScore);
    const lastMax = orderedRules.at(-1)?.maxScore ?? -1;
    const minScore = lastMax < 100 ? lastMax + 1 : 0;
    const maxScore = lastMax < 100 ? 100 : 0;
    const id = `rule-${Date.now()}`;

    setRules((current) => [
      ...current,
      {
        id,
        label: "New rule",
        minScore,
        maxScore,
        confettiEnabled: true,
        soundEnabled: false,
        soundPath: fallbackSoundPath,
      },
    ]);
  }

  function deleteRule(ruleId: string) {
    if (rules.length <= 1) {
      toast.error("At least one celebration rule is required");
      return;
    }

    setRules((current) => current.filter((rule) => rule.id !== ruleId));
  }

  function getRuleError() {
    const orderedRules = [...rules].sort((a, b) => a.minScore - b.minScore);
    for (const rule of orderedRules) {
      if (!rule.label.trim()) return "Every rule needs a label";
      if (rule.minScore < 0 || rule.maxScore > 100 || rule.minScore > rule.maxScore) {
        return "Score ranges must stay between 0 and 100";
      }
      if (!availableSounds.some((sound) => sound.path === rule.soundPath)) {
        return `Choose a valid sound file for ${rule.label}`;
      }
    }

    for (let index = 1; index < orderedRules.length; index += 1) {
      if (orderedRules[index].minScore <= orderedRules[index - 1].maxScore) {
        return "Score ranges cannot overlap";
      }
    }

    return null;
  }

  async function saveCelebrationRules() {
    if (saving || !hasUnsavedRules) return;

    const error = getRuleError();
    if (error) {
      toast.error(error);
      return;
    }

    const previousSavedRules = savedRules;
    setSavedRules(rules);
    setSaving(true);

    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ celebrationRules: rules }),
      });
      const data: unknown = await res.json().catch(() => ({}));

      if (!res.ok) {
        setSavedRules(previousSavedRules);
        const message =
          typeof data === "object" &&
          data !== null &&
          "error" in data &&
          typeof data.error === "string"
            ? data.error
            : "Could not update celebration rules";
        toast.error(message);
        return;
      }

      toast.success("Celebration rules saved");
    } catch {
      setSavedRules(previousSavedRules);
      toast.error("Network error while updating rules");
    } finally {
      setSaving(false);
    }
  }

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
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8C6D50]">Sound library</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  Preview uploaded sound files. Playback is controlled only by the Celebration Rules below.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSoundLibraryExpanded((value) => !value)}
                className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
                aria-expanded={soundLibraryExpanded}
              >
                {soundLibraryExpanded ? "Collapse" : "Expand"}
                <ChevronDown className={`h-4 w-4 transition-transform ${soundLibraryExpanded ? "rotate-180" : ""}`} />
              </button>
            </div>

            {soundLibraryExpanded && (
              availableSounds.length === 0 ? (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                  No audio files found in public/assets.
                </div>
              ) : (
                <div className="grid gap-2">
                  {availableSounds.map((sound) => (
                    <div
                      key={sound.path}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
                          <Music2 className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black text-slate-900">{sound.fileName}</span>
                          <span className="block truncate text-xs font-semibold text-slate-500">{sound.path}</span>
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => previewSound(sound.path)}
                        className="inline-flex h-10 flex-shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 text-xs font-black text-blue-700 transition hover:bg-blue-100"
                      >
                        {previewingPath === sound.path ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                        {previewingPath === sound.path ? "Stop" : "Preview"}
                      </button>
                    </div>
                  ))}
                </div>
              )
            )}

            <div className="mt-5 border-t border-[#E8E2D8] pt-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8C6D50]">Celebration rules</p>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    Choose what happens for each score range. The global sound switch still controls whether rule sounds can play.
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    onClick={addRule}
                    className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-violet-100 bg-violet-50 px-4 text-sm font-black text-violet-700 transition hover:bg-violet-100"
                  >
                    <Plus className="h-4 w-4" />
                    Add Rule
                  </button>
                  <button
                    type="button"
                    onClick={saveCelebrationRules}
                    disabled={!hasUnsavedRules || saving}
                    className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 text-sm font-black text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Rules
                  </button>
                </div>
              </div>

              <div className="grid gap-3">
                {rules.map((rule, index) => (
                  <div key={rule.id} className="rounded-[20px] border border-slate-200 bg-white/85 p-4 shadow-[0_10px_26px_rgba(44,42,40,0.04)]">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-700">
                          <Sparkles className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#8C6D50]">Rule {index + 1}</p>
                          <input
                            value={rule.label}
                            onChange={(event) => updateRule(rule.id, { label: event.target.value })}
                            className="mt-1 h-10 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none transition focus:border-violet-200 focus:ring-4 focus:ring-violet-100/70 sm:w-64"
                            placeholder="Rule label"
                            maxLength={40}
                            aria-label={`Label for celebration rule ${index + 1}`}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteRule(rule.id)}
                        className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 text-xs font-black text-rose-600 transition hover:bg-rose-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1.45fr]">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Min %</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={rule.minScore}
                            onChange={(event) => updateRule(rule.id, { minScore: Number(event.target.value) })}
                            className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none transition focus:border-violet-200 focus:ring-4 focus:ring-violet-100/70"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Max %</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={rule.maxScore}
                            onChange={(event) => updateRule(rule.id, { maxScore: Number(event.target.value) })}
                            className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none transition focus:border-violet-200 focus:ring-4 focus:ring-violet-100/70"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <label
                          className={`flex h-16 cursor-pointer items-center justify-between gap-2 rounded-2xl border px-3 text-sm font-black transition ${
                            rule.confettiEnabled ? "border-violet-200 bg-violet-50 text-violet-700" : "border-slate-200 bg-slate-50 text-slate-500"
                          }`}
                        >
                          Confetti
                          <input
                            type="checkbox"
                            checked={rule.confettiEnabled}
                            onChange={(event) => updateRule(rule.id, { confettiEnabled: event.target.checked })}
                            className="h-4 w-4 accent-violet-600"
                          />
                        </label>
                        <label
                          className={`flex h-16 cursor-pointer items-center justify-between gap-2 rounded-2xl border px-3 text-sm font-black transition ${
                            rule.soundEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"
                          }`}
                        >
                          Sound
                          <input
                            type="checkbox"
                            checked={rule.soundEnabled}
                            onChange={(event) => updateRule(rule.id, { soundEnabled: event.target.checked })}
                            className="h-4 w-4 accent-emerald-600"
                          />
                        </label>
                      </div>

                      <label className="block md:col-span-2 xl:col-span-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">Sound file</span>
                        <select
                          value={rule.soundPath}
                          onChange={(event) => updateRule(rule.id, { soundPath: event.target.value })}
                          className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none transition focus:border-violet-200 focus:ring-4 focus:ring-violet-100/70"
                        >
                          {availableSounds.map((sound) => (
                            <option key={sound.path} value={sound.path}>
                              {sound.fileName}
                            </option>
                          ))}
                        </select>
                        <span className="mt-1 block text-[11px] font-semibold text-slate-500">
                          This sound will play for this range when Sound is on.
                        </span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
