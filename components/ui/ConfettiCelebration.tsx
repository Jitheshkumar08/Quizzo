"use client";

import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

interface ConfettiCelebrationProps {
  /** When true, plays /assets/celebration.mp3 alongside the confetti */
  playSound?: boolean;
}

/**
 * Fires a premium party-popper / confetti cannon effect.
 * Renders nothing visually — it uses the full-page canvas-confetti overlay.
 * Automatically cleans up after the show (~4 s).
 *
 * If `playSound` is true, also plays the celebration sound from:
 *   public/assets/celebration.mp3
 * (swap that file anytime — same filename, same path)
 */
export default function ConfettiCelebration({ playSound = false }: ConfettiCelebrationProps) {
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    // ── Sound (90%+ scores) ────────────────────────────────
    if (playSound) {
      try {
        const audio = new Audio("/assets/congralutions.mp3");
        audio.preload = "auto";
        audio.volume = 0.7;

        const tryPlay = () => {
          audio.play().catch((err) => {
            console.warn("[ConfettiCelebration] Audio play blocked:", err.message);
          });
        };

        // If the browser already has enough data, play immediately.
        // Otherwise wait for the file to load, then play.
        if (audio.readyState >= 3) {
          tryPlay();
        } else {
          audio.addEventListener("canplaythrough", tryPlay, { once: true });
          // Safety: if canplaythrough never fires (e.g. 404), clean up
          audio.addEventListener("error", () => {
            console.warn("[ConfettiCelebration] Could not load /assets/congralutions.mp3 — place your MP3 file in public/assets/congralutions.mp3");
          }, { once: true });
          audio.load(); // kick off loading
        }
      } catch {
        /* Audio constructor not available (SSR guard) */
      }
    }

    // ── Burst 1 — left cannon ──────────────────────────────
    const fireLeft = () =>
      confetti({
        particleCount: 80,
        angle: 60,
        spread: 70,
        startVelocity: 55,
        origin: { x: 0, y: 0.7 },
        colors: [
          "#a855f7", "#7c3aed", "#06b6d4", "#22d3ee",
          "#facc15", "#fb923c", "#f472b6", "#34d399",
        ],
        gravity: 0.9,
        scalar: 1.1,
        drift: 0.1,
        ticks: 250,
        shapes: ["square", "circle"],
      });

    // ── Burst 2 — right cannon ─────────────────────────────
    const fireRight = () =>
      confetti({
        particleCount: 80,
        angle: 120,
        spread: 70,
        startVelocity: 55,
        origin: { x: 1, y: 0.7 },
        colors: [
          "#a855f7", "#7c3aed", "#06b6d4", "#22d3ee",
          "#facc15", "#fb923c", "#f472b6", "#34d399",
        ],
        gravity: 0.9,
        scalar: 1.1,
        drift: -0.1,
        ticks: 250,
        shapes: ["square", "circle"],
      });

    // ── Center shower ──────────────────────────────────────
    const fireCenterShower = () =>
      confetti({
        particleCount: 50,
        spread: 100,
        startVelocity: 40,
        origin: { x: 0.5, y: 0.3 },
        colors: [
          "#a855f7", "#06b6d4", "#facc15", "#f472b6",
          "#34d399", "#fb923c", "#7c3aed",
        ],
        gravity: 1,
        scalar: 1.2,
        ticks: 200,
        shapes: ["circle"],
      });

    // ── Star sparkles ──────────────────────────────────────
    const fireStars = () =>
      confetti({
        particleCount: 25,
        spread: 360,
        startVelocity: 20,
        origin: { x: 0.5, y: 0.45 },
        colors: ["#fbbf24", "#f59e0b", "#ffffff"],
        gravity: 0.4,
        scalar: 0.9,
        ticks: 180,
        shapes: ["star"],
        flat: true,
      });

    // ── Sequence ───────────────────────────────────────────
    // Immediate double cannon
    fireLeft();
    fireRight();

    // Staggered follow-ups for a lush, cinematic feel
    setTimeout(() => {
      fireLeft();
      fireRight();
    }, 350);

    setTimeout(() => fireCenterShower(), 600);

    setTimeout(() => {
      fireLeft();
      fireRight();
      fireStars();
    }, 900);

    setTimeout(() => fireCenterShower(), 1300);
    setTimeout(() => fireStars(), 1700);

    // Final gentle shower
    setTimeout(() => {
      confetti({
        particleCount: 30,
        spread: 120,
        startVelocity: 15,
        origin: { x: 0.5, y: 0.2 },
        colors: ["#a855f7", "#06b6d4", "#facc15"],
        gravity: 0.6,
        scalar: 0.8,
        ticks: 200,
      });
    }, 2200);
  }, [playSound]);

  return null; // renders nothing — confetti uses its own full-page canvas
}
