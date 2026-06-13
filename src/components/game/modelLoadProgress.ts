import type { DownloadProgress } from "../../ai/policy";

export const MODEL_PROGRESS_CEILING = 0.9;
export const MODEL_PROGRESS_EASE_MS = 1500;

export function realModelFraction(progress: DownloadProgress | null): number {
  if (progress === null || progress.total === null || progress.total <= 0) {
    return 0;
  }
  return Math.min(1, progress.loaded / progress.total);
}

export function easedModelProgress(
  elapsedMs: number,
  progress: DownloadProgress | null,
): number {
  const t = Math.min(1, Math.max(0, elapsedMs / MODEL_PROGRESS_EASE_MS));
  const fake = MODEL_PROGRESS_CEILING * (1 - Math.pow(1 - t, 3));
  const real = realModelFraction(progress) * MODEL_PROGRESS_CEILING;
  return Math.max(fake, real);
}
