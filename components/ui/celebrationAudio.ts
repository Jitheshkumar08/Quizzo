"use client";

const CELEBRATION_SOUND_SRC = "/assets/congralutions.mp3";

declare global {
  interface Window {
    __quizzoCelebrationAudio?: Record<string, HTMLAudioElement>;
  }
}

function getCelebrationAudio(src = CELEBRATION_SOUND_SRC) {
  if (typeof window === "undefined") return null;

  window.__quizzoCelebrationAudio ??= {};

  if (!window.__quizzoCelebrationAudio[src]) {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = 0.7;
    window.__quizzoCelebrationAudio[src] = audio;
  }

  return window.__quizzoCelebrationAudio[src];
}

export function primeCelebrationSound() {
  const audio = getCelebrationAudio();
  if (!audio) return;

  audio.load();
  const originalVolume = audio.volume;
  audio.volume = 0;

  void audio.play()
    .then(() => {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = originalVolume;
    })
    .catch(() => {
      audio.volume = originalVolume;
    });
}

export function playCelebrationSound(src?: string) {
  const audio = getCelebrationAudio(src);
  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;
  audio.volume = 0.7;

  void audio.play().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[ConfettiCelebration] Audio play blocked:", message);
  });
}
