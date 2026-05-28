import { create } from "zustand";

const HIGH_VISIBILITY_KEY = "browslatro:highVisibility";
const MUTED_KEY = "browslatro:muted";
const ANIMATION_SPEED_KEY = "browslatro:animationSpeed";

export type AnimationSpeed = "slow" | "normal" | "fast" | "instant";

export const ANIMATION_SPEED_VALUES: ReadonlyArray<AnimationSpeed> = [
  "slow",
  "normal",
  "fast",
  "instant",
];

const ANIMATION_SPEED_MULTIPLIERS: Readonly<Record<AnimationSpeed, number>> = {
  slow: 2,
  normal: 1,
  fast: 0.5,
  instant: 0,
};

const DEFAULT_ANIMATION_SPEED: AnimationSpeed = "normal";

function readBoolean(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writeBoolean(key: string, value: boolean): void {
  try {
    window.localStorage.setItem(key, value ? "true" : "false");
  } catch {
    return;
  }
}

function isAnimationSpeed(value: string | null): value is AnimationSpeed {
  return value !== null && (ANIMATION_SPEED_VALUES as ReadonlyArray<string>).includes(value);
}

function readAnimationSpeed(): AnimationSpeed {
  try {
    const raw = window.localStorage.getItem(ANIMATION_SPEED_KEY);
    return isAnimationSpeed(raw) ? raw : DEFAULT_ANIMATION_SPEED;
  } catch {
    return DEFAULT_ANIMATION_SPEED;
  }
}

function writeAnimationSpeed(value: AnimationSpeed): void {
  try {
    window.localStorage.setItem(ANIMATION_SPEED_KEY, value);
  } catch {
    return;
  }
}

interface PreferencesState {
  highVisibility: boolean;
  muted: boolean;
  animationSpeed: AnimationSpeed;
}

export const usePreferences = create<PreferencesState>()(() => ({
  highVisibility: readBoolean(HIGH_VISIBILITY_KEY),
  muted: readBoolean(MUTED_KEY),
  animationSpeed: readAnimationSpeed(),
}));

export function isHighVisibility(): boolean {
  return usePreferences.getState().highVisibility;
}

export function toggleHighVisibility(): void {
  const next = !usePreferences.getState().highVisibility;
  usePreferences.setState({ highVisibility: next });
  writeBoolean(HIGH_VISIBILITY_KEY, next);
}

export function isMuted(): boolean {
  return usePreferences.getState().muted;
}

export function toggleMute(): void {
  const next = !usePreferences.getState().muted;
  usePreferences.setState({ muted: next });
  writeBoolean(MUTED_KEY, next);
}

export function getAnimationSpeed(): AnimationSpeed {
  return usePreferences.getState().animationSpeed;
}

export function setAnimationSpeed(value: AnimationSpeed): void {
  const next = isAnimationSpeed(value) ? value : DEFAULT_ANIMATION_SPEED;
  usePreferences.setState({ animationSpeed: next });
  writeAnimationSpeed(next);
}

export function getAnimationSpeedMultiplier(
  speed: AnimationSpeed = usePreferences.getState().animationSpeed,
): number {
  return ANIMATION_SPEED_MULTIPLIERS[speed];
}

export function hasUserOverriddenAnimationSpeed(
  speed: AnimationSpeed = usePreferences.getState().animationSpeed,
): boolean {
  return speed !== DEFAULT_ANIMATION_SPEED;
}
