"use client";

import { CalendarClock, KeyRound, Repeat, Timer } from "lucide-react";

export interface QuizAccessSettingsProps {
  /** `light` = edit quiz white/gray cards; `glass` = instructor upload (warm gray + glass panel) */
  variant?: "light" | "glass";
  scheduleEnabled: boolean;
  onScheduleEnabled: (v: boolean) => void;
  scheduledStart: string;
  scheduledEnd: string;
  onScheduledStart: (v: string) => void;
  onScheduledEnd: (v: string) => void;
  requireQuizPassword: boolean;
  onRequireQuizPassword: (v: boolean) => void;
  quizAccessPassword: string;
  onQuizAccessPassword: (v: string) => void;
  hasExistingPassword?: boolean;
  allowMultipleAttempts: boolean;
  onAllowMultipleAttempts: (v: boolean) => void;
  timeLimitEnabled: boolean;
  onTimeLimitEnabled: (v: boolean) => void;
  timeLimitMinutes: number;
  onTimeLimitMinutes: (v: number) => void;
}

export default function QuizAccessSettings({
  variant = "light",
  scheduleEnabled,
  onScheduleEnabled,
  scheduledStart,
  scheduledEnd,
  onScheduledStart,
  onScheduledEnd,
  requireQuizPassword,
  onRequireQuizPassword,
  quizAccessPassword,
  onQuizAccessPassword,
  hasExistingPassword,
  allowMultipleAttempts,
  onAllowMultipleAttempts,
  timeLimitEnabled,
  onTimeLimitEnabled,
  timeLimitMinutes,
  onTimeLimitMinutes,
}: QuizAccessSettingsProps) {
  const isGlass = variant === "glass";

  const box = isGlass
    ? "glass rounded-2xl border border-white/20 p-5 space-y-5 shadow-[0_16px_32px_rgba(44,42,40,0.06),0_2px_6px_rgba(44,42,40,0.04)]"
    : "rounded-2xl border border-black/5 bg-gray-50/80 p-5 space-y-5";

  const titleClass = isGlass
    ? "text-sm font-bold text-[#2C2A28] tracking-tight"
    : "text-sm font-bold text-gray-900";

  const subClass = isGlass
    ? "text-xs text-[#918B80] font-medium leading-relaxed"
    : "text-xs text-gray-500";

  const labelUpper = isGlass
    ? "text-xs font-bold text-[#6B7280] uppercase tracking-wider"
    : "text-xs font-bold text-gray-500 uppercase tracking-wider";

  const rowLabel = isGlass
    ? "text-sm font-medium text-[#2C2A28]"
    : "text-sm font-medium text-gray-800";

  const radioLabel = isGlass ? "text-sm text-[#374151] font-medium" : "text-sm text-gray-700";

  const inputClass = isGlass
    ? "w-full px-3 py-2.5 rounded-xl bg-white/80 border-2 border-transparent shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] text-[#2C2A28] placeholder-[#918B80] focus:outline-none focus:bg-white focus:border-[#8C5D3E]/30 text-sm transition-all"
    : "w-full px-3 py-2.5 rounded-xl bg-white border border-black/10 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30 text-sm";

  const divider = isGlass ? "border-t border-black/8 pt-4" : "border-t border-black/5 pt-4";

  const iconCalendar = isGlass ? "text-[#8b5cf6]" : "text-purple-600";
  const iconRepeat = isGlass ? "text-[#0891b2]" : "text-cyan-600";

  return (
    <div className={box}>
      <div className="flex items-center gap-2">
        <CalendarClock className={`w-4 h-4 ${iconCalendar}`} />
        <h3 className={titleClass}>Optional: schedule &amp; access</h3>
      </div>
      <p className={subClass}>
        Limit when students can take the quiz, require a shared password, and control retakes.
      </p>

      <label className="flex items-center gap-3 cursor-pointer group">
        <input
          type="checkbox"
          checked={scheduleEnabled}
          onChange={(e) => onScheduleEnabled(e.target.checked)}
          className="rounded border-[#C4BFB5] text-[#8b5cf6] focus:ring-[#8b5cf6]/40 w-4 h-4"
        />
        <span className={rowLabel}>Schedule availability window</span>
      </label>
      {scheduleEnabled && (
        <div className="grid sm:grid-cols-2 gap-3 pl-7">
          <div className="space-y-1">
            <span className={labelUpper}>Opens (local time)</span>
            <input
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => onScheduledStart(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <span className={labelUpper}>Closes (local time)</span>
            <input
              type="datetime-local"
              value={scheduledEnd}
              onChange={(e) => onScheduledEnd(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      )}

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={requireQuizPassword}
          onChange={(e) => onRequireQuizPassword(e.target.checked)}
          className="rounded border-[#C4BFB5] text-[#8b5cf6] focus:ring-[#8b5cf6]/40 w-4 h-4"
        />
        <span className={`${rowLabel} flex items-center gap-2`}>
          <KeyRound className={`w-4 h-4 ${isGlass ? "text-[#8b5cf6]" : "text-gray-500"}`} />
          Require quiz password
        </span>
      </label>
      {requireQuizPassword && (
        <div className="space-y-1 pl-7">
          <input
            type="password"
            value={quizAccessPassword}
            onChange={(e) => onQuizAccessPassword(e.target.value)}
            placeholder={hasExistingPassword ? "New password (leave blank to keep current)" : "Min. 4 characters"}
            autoComplete="new-password"
            className={inputClass}
          />
          {hasExistingPassword && <p className={subClass}>Students use this password to open the quiz (not their login).</p>}
        </div>
      )}

      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={timeLimitEnabled}
          onChange={(e) => onTimeLimitEnabled(e.target.checked)}
          className="rounded border-[#C4BFB5] text-[#8b5cf6] focus:ring-[#8b5cf6]/40 w-4 h-4"
        />
        <span className={`${rowLabel} flex items-center gap-2`}>
          <Timer className={`w-4 h-4 ${isGlass ? "text-[#8b5cf6]" : "text-gray-500"}`} />
          Per-attempt time limit
        </span>
      </label>
      {timeLimitEnabled && (
        <div className="space-y-1 pl-7">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2">
              <span className={labelUpper}>Minutes</span>
              <input
                type="number"
                min={1}
                max={1440}
                value={timeLimitMinutes}
                onChange={(e) => onTimeLimitMinutes(Math.max(1, Math.min(1440, Number(e.target.value) || 1)))}
                className={`${inputClass} w-24`}
              />
            </label>
          </div>
          <p className={subClass}>
            Timer starts when a student first opens the quiz. They can leave and resume until time runs out or they submit.
            If time expires, the attempt is submitted automatically with their current answers.
          </p>
        </div>
      )}

      <div className={`flex items-start gap-3 ${divider}`}>
        <Repeat className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconRepeat}`} />
        <div className="space-y-2 flex-1">
          <span className={rowLabel}>Attempts per student</span>
          <div className="flex flex-col gap-2.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="attempts"
                checked={!allowMultipleAttempts}
                onChange={() => onAllowMultipleAttempts(false)}
                className="text-[#8b5cf6] focus:ring-[#8b5cf6]/40 border-[#C4BFB5]"
              />
              <span className={radioLabel}>Single attempt</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="attempts"
                checked={allowMultipleAttempts}
                onChange={() => onAllowMultipleAttempts(true)}
                className="text-[#8b5cf6] focus:ring-[#8b5cf6]/40 border-[#C4BFB5]"
              />
              <span className={radioLabel}>Multiple attempts (unlimited)</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
