import { useEffect, useRef } from "react";

export interface ScoringStepSequence<T> {
  readonly items: ReadonlyArray<T>;
  readonly index: number;
  readonly setIndex: (updater: (prev: number) => number) => void;
  readonly stepMs: number;
  readonly onStep: (item: T, index: number) => void;
  readonly onFinish: () => void;
}

export function useScoringStepSequence<T>({
  items,
  index,
  setIndex,
  stepMs,
  onStep,
  onFinish,
}: ScoringStepSequence<T>): void {
  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  useEffect(() => {
    if (items.length === 0) return;
    if (index >= items.length) {
      onFinishRef.current();
      return;
    }
    const timer = window.setTimeout(() => {
      onStepRef.current(items[index], index);
      setIndex((prev) => prev + 1);
    }, stepMs);
    return () => window.clearTimeout(timer);
  }, [items, index, setIndex, stepMs]);
}
