"use client";

const CELEBRATION_SOUND_SRC = "/assets/congralutions.mp3";

declare global {
  interface Window {
    __quizzoCelebrationAudio?: HTMLAudioElement;
  }
}

function getCelebrationAudio() {
  if (typeof window === "undefined") return null;

  if (!window.__quizzoCelebrationAudio) {
    const audio = new Audio(CELEBRATION_SOUND_SRC);
    audio.preload = "auto";
    audio.volume = 0.7;
    window.__quizzoCelebrationAudio = audio;
  }

  return window.__quizzoCelebrationAudio;
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

export function playCelebrationSound() {
  const audio = getCelebrationAudio();
  if (!audio) return;

  audio.pause();
  audio.currentTime = 0;
  audio.volume = 0.7;

  void audio.play().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[ConfettiCelebration] Audio play blocked:", message);
  });
}
