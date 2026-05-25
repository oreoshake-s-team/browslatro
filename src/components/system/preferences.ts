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
  slow: 1.5,
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

let highVisibility = readBoolean(HIGH_VISIBILITY_KEY);
let muted = readBoolean(MUTED_KEY);
let animationSpeed: AnimationSpeed = readAnimationSpeed();

export function isHighVisibility(): boolean {
  return highVisibility;
}

export function toggleHighVisibility(): void {
  highVisibility = !highVisibility;
  writeBoolean(HIGH_VISIBILITY_KEY, highVisibility);
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): void {
  muted = !muted;
  writeBoolean(MUTED_KEY, muted);
}

export function getAnimationSpeed(): AnimationSpeed {
  return animationSpeed;
}

export function setAnimationSpeed(value: AnimationSpeed): void {
  if (!isAnimationSpeed(value)) {
    animationSpeed = DEFAULT_ANIMATION_SPEED;
    writeAnimationSpeed(DEFAULT_ANIMATION_SPEED);
    return;
  }
  animationSpeed = value;
  writeAnimationSpeed(value);
}

export function getAnimationSpeedMultiplier(speed: AnimationSpeed = animationSpeed): number {
  return ANIMATION_SPEED_MULTIPLIERS[speed];
}

export function hasUserOverriddenAnimationSpeed(speed: AnimationSpeed = animationSpeed): boolean {
  return speed !== DEFAULT_ANIMATION_SPEED;
}
