import type { Joker, JokerSticker, JokerStickerKind, RandomSource } from "./types";

export const PERISHABLE_LIFE = 5;
export const RENTAL_BASE_PRICE = 1;
export const RENTAL_END_OF_ROUND_DRAIN = 3;

export interface JokerStickerInfo {
  readonly kind: JokerStickerKind;
  readonly name: string;
  readonly description: string;
}

export const JOKER_STICKER_INFO: Readonly<Record<JokerStickerKind, JokerStickerInfo>> = {
  eternal: {
    kind: "eternal",
    name: "Eternal",
    description: "Cannot be sold or destroyed.",
  },
  perishable: {
    kind: "perishable",
    name: "Perishable",
    description: `Debuffed after ${PERISHABLE_LIFE} rounds.`,
  },
  rental: {
    kind: "rental",
    name: "Rental",
    description: `Costs $${RENTAL_BASE_PRICE}, loses $${RENTAL_END_OF_ROUND_DRAIN} at end of round.`,
  },
};

export function jokerStickers(joker: Joker): ReadonlyArray<JokerSticker> {
  return joker.stickers ?? [];
}

export function hasSticker(joker: Joker, kind: JokerStickerKind): boolean {
  return jokerStickers(joker).some((s) => s.kind === kind);
}

export function canSellJoker(joker: Joker): boolean {
  return !hasSticker(joker, "eternal");
}

export function canDestroyJoker(joker: Joker): boolean {
  return !hasSticker(joker, "eternal");
}

export function isJokerActive(joker: Joker): boolean {
  for (const s of jokerStickers(joker)) {
    if (s.kind === "perishable" && s.roundsHeld >= PERISHABLE_LIFE) return false;
  }
  return true;
}

export interface StakeStickerOdds {
  readonly eternal?: number;
  readonly perishable?: number;
  readonly rental?: number;
}

export function applyStakeStickersOnRoll(
  joker: Joker,
  odds: StakeStickerOdds | undefined,
  rng: RandomSource = Math.random,
): Joker {
  if (!odds) return joker;
  let rolled: JokerSticker | null = null;
  if (odds.eternal !== undefined && rng() < odds.eternal) {
    rolled = { kind: "eternal" };
  } else if (odds.perishable !== undefined && rng() < odds.perishable) {
    rolled = { kind: "perishable", roundsHeld: 0 };
  } else if (odds.rental !== undefined && rng() < odds.rental) {
    rolled = { kind: "rental" };
  }
  if (rolled === null) return joker;
  return { ...joker, stickers: [...jokerStickers(joker), rolled] };
}

export function tickPerishableRounds(jokers: ReadonlyArray<Joker>): Joker[] {
  return jokers.map((j) => {
    const stickers = jokerStickers(j);
    if (stickers.length === 0) return j;
    const next = stickers.map((s) =>
      s.kind === "perishable" ? { ...s, roundsHeld: s.roundsHeld + 1 } : s,
    );
    return { ...j, stickers: next };
  });
}
