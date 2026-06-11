import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Hand } from "../../cards/types";
import { tHandLabel } from "../../i18n/handLabels";
import { formatNumber } from "../../utils/formatNumber";
import "./HandScore.css";

interface HandScoreProps {
  chips: number;
  multiplier: number;
  selectedHand: Hand | null;
  selectedHandLevel?: number | null;
}

interface CountUp {
  readonly value: number;
  readonly leveling: boolean;
}

const COUNT_UP_MS = 700;
const ANNOUNCE_DEBOUNCE_MS = 120;

function useDebouncedText(text: string): string {
  const [debounced, setDebounced] = useState(text);
  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebounced(text),
      ANNOUNCE_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [text]);
  return debounced;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useCountUp(
  target: number,
  anchor: string | null,
  animateOn: number | null,
): CountUp {
  const [value, setValue] = useState(target);
  const [leveling, setLeveling] = useState(false);
  const prevAnchor = useRef<string | null>(anchor);
  const prevAnimateOn = useRef<number | null>(animateOn);
  const displayedRef = useRef(target);

  useEffect(() => {
    displayedRef.current = value;
  }, [value]);

  useEffect(() => {
    const anchorChanged = prevAnchor.current !== anchor;
    const animateOnChanged = animateOn !== prevAnimateOn.current;
    prevAnchor.current = anchor;
    prevAnimateOn.current = animateOn;
    if (anchor === null || target === displayedRef.current) {
      if (target !== displayedRef.current) {
        displayedRef.current = target;
        setValue(target);
      }
      setLeveling(false);
      return;
    }
    const shouldAnimate = anchorChanged
      ? animateOn !== null && animateOn > 1
      : animateOnChanged && animateOn !== null;
    if (!shouldAnimate) {
      displayedRef.current = target;
      setValue(target);
      return;
    }
    if (prefersReducedMotion()) {
      displayedRef.current = target;
      setValue(target);
      setLeveling(true);
      const timer = window.setTimeout(() => setLeveling(false), 250);
      return () => window.clearTimeout(timer);
    }
    const start = displayedRef.current;
    const delta = target - start;
    const t0 = performance.now();
    setLeveling(true);
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / COUNT_UP_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(start + delta * eased);
      displayedRef.current = next;
      setValue(next);
      if (t < 1) {
        raf = window.requestAnimationFrame(tick);
      } else {
        setLeveling(false);
      }
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [target, anchor, animateOn]);

  return { value, leveling };
}

function HandScore({
  chips,
  multiplier,
  selectedHand,
  selectedHandLevel = null,
}: HandScoreProps) {
  const { t } = useTranslation();
  const announcement = useDebouncedText(
    t("handScore.preview", {
      chips: formatNumber(chips),
      mult: formatNumber(multiplier),
    }),
  );
  const hasLevel =
    selectedHand !== null && typeof selectedHandLevel === "number";
  const labelKey = selectedHand?.label ?? null;
  const levelTrigger = hasLevel ? selectedHandLevel : null;
  const chipsAnim = useCountUp(chips, labelKey, levelTrigger);
  const multAnim = useCountUp(multiplier, labelKey, levelTrigger);
  return (
    <div className="hand-score">
      {selectedHand !== null && (
        <h3
          aria-label={
            hasLevel
              ? t("a11y.handLevel", {
                  hand: tHandLabel(t, selectedHand.label),
                  level: selectedHandLevel,
                })
              : undefined
          }
        >
          <span>{tHandLabel(t, selectedHand.label)}</span>
          {hasLevel && (
            <span className="hand-score-level" aria-hidden="true">
              Lv {selectedHandLevel}
            </span>
          )}
        </h3>
      )}
      <p aria-hidden="true">
        <span
          key={`chips-${labelKey ?? "none"}`}
          className={`chips${chipsAnim.leveling ? " hand-score-leveling" : ""}`}
          data-leveling={chipsAnim.leveling || undefined}
        >
          {formatNumber(chipsAnim.value)}
        </span>
        <span>X</span>
        <span
          key={`mult-${labelKey ?? "none"}`}
          className={`multiplier${multAnim.leveling ? " hand-score-leveling" : ""}`}
          data-leveling={multAnim.leveling || undefined}
        >
          {formatNumber(multAnim.value)}
        </span>
      </p>
      <p
        className="hand-score-announcement"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </p>
    </div>
  );
}

export default HandScore;
