import { useEffect, useRef, useState } from "react";
import type { DownloadProgress } from "../../ai/policy";
import {
  MODEL_PROGRESS_CEILING,
  MODEL_PROGRESS_EASE_MS,
  easedModelProgress,
  realModelFraction,
} from "./modelLoadProgress";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function useModelLoadProgress(progress: DownloadProgress | null): number {
  const [value, setValue] = useState(() => easedModelProgress(0, progress));
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    if (progress === null) {
      startRef.current = null;
      setValue(0);
      return;
    }
    if (prefersReducedMotion()) {
      const real = realModelFraction(progress) * MODEL_PROGRESS_CEILING;
      setValue(progress.total !== null ? real : MODEL_PROGRESS_CEILING);
      return;
    }
    if (startRef.current === null) startRef.current = performance.now();
    let raf = 0;
    const tick = (now: number): void => {
      const elapsed = now - (startRef.current ?? now);
      setValue(easedModelProgress(elapsed, progress));
      if (elapsed < MODEL_PROGRESS_EASE_MS) {
        raf = window.requestAnimationFrame(tick);
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [progress]);
  return value;
}
