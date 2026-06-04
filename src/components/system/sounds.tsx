import { isMuted, usePreferences } from "./preferences";

const cache = new Map<string, HTMLAudioElement>();
const synths = new Map<string, () => void>();

function preload(name: string, url: string): void {
  const audio = new Audio(url);
  audio.volume = 0.4;
  cache.set(name, audio);
}

function registerSynth(name: string, synth: () => void): void {
  synths.set(name, synth);
}

export function play(name: string): void {
  if (isMuted()) return;
  const synth = synths.get(name);
  if (synth) {
    synth();
    return;
  }
  const audio = cache.get(name);
  if (!audio) return;
  const cloned = audio.cloneNode() as HTMLAudioElement;
  cloned.play()?.catch(() => {});
}

function playGoldChime(): void {
  if (typeof AudioContext === "undefined") return;
  const ctx = new AudioContext();
  const notes = [659.25, 987.77, 1318.51];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    osc.connect(gain).connect(ctx.destination);
    const startAt = ctx.currentTime + i * 0.05;
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(0.18, startAt + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.45);
    osc.start(startAt);
    osc.stop(startAt + 0.55);
  });
}

registerSynth("gold", playGoldChime);

let preloaded = false;

function preloadAll(): void {
  if (preloaded) return;
  preloaded = true;
  preload("pop", "/sounds/pop.mp3");
  preload("win", "/sounds/win.mp3");
  preload("lose", "/sounds/lose.mp3");
}

function schedulePreload(): void {
  const w = window as Window & {
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void;
  };
  if (typeof w.requestIdleCallback === "function") {
    w.requestIdleCallback(preloadAll, { timeout: 2000 });
  } else {
    window.setTimeout(preloadAll, 200);
  }
}

if (typeof window !== "undefined") {
  if (!isMuted()) schedulePreload();
  usePreferences.subscribe((state, prev) => {
    if (prev.muted && !state.muted) schedulePreload();
  });
}
