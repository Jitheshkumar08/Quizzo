import fs from "node:fs/promises";
import path from "node:path";

const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".ogg", ".m4a", ".aac", ".webm"]);
export const DEFAULT_CELEBRATION_SOUND_PATH = "/assets/congralutions.mp3";

export interface CelebrationSoundAsset {
  fileName: string;
  path: string;
}

function assetsDirectory() {
  return path.join(process.cwd(), "public", "assets");
}

function isAudioFile(fileName: string) {
  return AUDIO_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

export async function listCelebrationSounds(): Promise<CelebrationSoundAsset[]> {
  try {
    const entries = await fs.readdir(assetsDirectory(), { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && isAudioFile(entry.name))
      .map((entry) => ({
        fileName: entry.name,
        path: `/assets/${entry.name}`,
      }))
      .sort((a, b) => a.fileName.localeCompare(b.fileName));
  } catch (error) {
    console.error("[LIST CELEBRATION SOUNDS ERROR]", error);
    return [];
  }
}

export async function isValidCelebrationSoundPath(soundPath: string) {
  if (!soundPath.startsWith("/assets/")) return false;

  const fileName = path.basename(soundPath);
  if (soundPath !== `/assets/${fileName}` || !isAudioFile(fileName)) return false;

  try {
    const stats = await fs.stat(path.join(assetsDirectory(), fileName));
    return stats.isFile();
  } catch {
    return false;
  }
}
