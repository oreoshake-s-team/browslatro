import { isMuted } from "./preferences";

const cache = new Map();

function preload(name: string, url: string): void {
  const audio = new Audio(url);
  audio.volume = 0.4;
  cache.set(name, audio);
}

export function play(name: string): void {
  if (isMuted()) return;
  const audio = cache.get(name);
  if (!audio) return;
  audio
    .cloneNode()
    .play()
    .catch(() => {});
}

// Preload balatro sounds
preload("pop", "/sounds/pop.mp3");
preload("win", "/sounds/win.mp3");
preload("lose", "/sounds/lose.mp3");
