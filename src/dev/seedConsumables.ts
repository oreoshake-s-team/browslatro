import type { Consumable } from "../items/consumables";
import { MAX_CONSUMABLE_SLOTS } from "../items/consumables";
import { createSpectralCatalog } from "../items/spectrals";
import { createTarotCatalog } from "../items/tarots";

const SEED_TAROT_IDS_KEY = "browslatro:seedTarotIds";
const SEED_SPECTRAL_IDS_KEY = "browslatro:seedSpectralIds";

function readIdsFromStorage(key: string): ReadonlyArray<string> {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    return raw.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
  } catch {
    return [];
  }
}

export function readSeededConsumables(): ReadonlyArray<Consumable> {
  const out: Consumable[] = [];
  const tarotIds = readIdsFromStorage(SEED_TAROT_IDS_KEY);
  if (tarotIds.length > 0) {
    const catalog = createTarotCatalog();
    for (const id of tarotIds) {
      const card = catalog.find((t) => t.id === id);
      if (card) out.push({ kind: "tarot", card });
    }
  }
  const spectralIds = readIdsFromStorage(SEED_SPECTRAL_IDS_KEY);
  if (spectralIds.length > 0) {
    const catalog = createSpectralCatalog();
    for (const id of spectralIds) {
      const card = catalog.find((s) => s.id === id);
      if (card) out.push({ kind: "spectral", card });
    }
  }
  return out.slice(0, MAX_CONSUMABLE_SLOTS);
}
