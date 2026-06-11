import type {
  Blind,
  Card,
  CardEdition,
  Enhancement,
  Rank,
  Seal,
  Suit,
} from "../cards/types";
import { BlindValues } from "../constants";
import type { BossBlind, BossEffect } from "../items/bosses";
import type {
  Joker,
  JokerEdition,
  JokerRarity,
  JokerStickerKind,
} from "../items/jokers/types";
import type { Stake } from "../items/stakes";
import { requiredChipsForBlind } from "../scoring/anteScaling";

export interface ModelCard {
  readonly id: number;
  readonly faceDown: false;
  readonly rank: Rank;
  readonly suit: Suit;
  readonly enhancement: Enhancement | null;
  readonly seal: Seal | null;
  readonly edition: CardEdition | null;
  readonly bonusChips: number;
}

export interface ModelFaceDownCard {
  readonly id: number;
  readonly faceDown: true;
}

export type ModelHandCard = ModelCard | ModelFaceDownCard;

export interface ModelJoker {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly effectKind: string;
  readonly rarity: JokerRarity;
  readonly edition: JokerEdition | null;
  readonly stickers: ReadonlyArray<JokerStickerKind>;
  readonly counter: number | null;
}

export type ModelBlindKind = "small" | "big" | "boss";

export interface ModelBoss {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly effectKind: BossEffect["kind"];
}

export interface ModelBlind {
  readonly kind: ModelBlindKind;
  readonly name: string;
  readonly scoreTarget: number;
  readonly boss: ModelBoss | null;
}

export interface ModelDeckComposition {
  readonly total: number;
  readonly bySuit: Readonly<Record<Suit, number>>;
  readonly byRank: Readonly<Record<Rank, number>>;
}

export interface ModelState {
  readonly hand: ReadonlyArray<ModelHandCard>;
  readonly jokers: ReadonlyArray<ModelJoker>;
  readonly blind: ModelBlind;
  readonly ante: number;
  readonly round: number;
  readonly stake: Stake;
  readonly money: number;
  readonly remainingHands: number;
  readonly remainingDiscards: number;
  readonly roundScore: number;
  readonly deck: ModelDeckComposition;
}

export interface ModelStateInput {
  readonly dealt: {
    readonly hand: ReadonlyArray<Card>;
    readonly remaining: ReadonlyArray<Card>;
  };
  readonly jokers: ReadonlyArray<Joker>;
  readonly blind: Blind;
  readonly ante: number;
  readonly round: number;
  readonly currentBoss: BossBlind;
  readonly selectedStake: Stake;
  readonly money: number;
  readonly remainingHands: number;
  readonly remainingDiscards: number;
  readonly roundScore: number;
}

const BLIND_KINDS: Readonly<Record<Blind, ModelBlindKind>> = {
  1: "small",
  2: "big",
  3: "boss",
};

function toModelHandCard(card: Card): ModelHandCard {
  if (card.faceDown) return { id: card.id, faceDown: true };
  return {
    id: card.id,
    faceDown: false,
    rank: card.rank,
    suit: card.suit,
    enhancement: card.enhancement ?? null,
    seal: card.seal ?? null,
    edition: card.edition ?? null,
    bonusChips: card.bonusChips ?? 0,
  };
}

function toModelJoker(joker: Joker): ModelJoker {
  return {
    id: joker.id,
    name: joker.name,
    description: joker.description,
    effectKind: joker.effect.kind,
    rarity: joker.rarity,
    edition: joker.edition ?? null,
    stickers: (joker.stickers ?? []).map((sticker) => sticker.kind),
    counter: joker.state?.kind === "counter" ? joker.state.value : null,
  };
}

function toModelBlind(input: ModelStateInput): ModelBlind {
  const kind = BLIND_KINDS[input.blind];
  const isBossRound = kind === "boss";
  return {
    kind,
    name: isBossRound ? input.currentBoss.name : BlindValues[input.blind],
    scoreTarget: requiredChipsForBlind({
      ante: input.ante,
      blind: input.blind,
      boss: input.currentBoss,
      stake: input.selectedStake,
    }),
    boss: isBossRound
      ? {
          id: input.currentBoss.id,
          name: input.currentBoss.name,
          description: input.currentBoss.description,
          effectKind: input.currentBoss.effect.kind,
        }
      : null,
  };
}

function toDeckComposition(
  remaining: ReadonlyArray<Card>,
): ModelDeckComposition {
  const bySuit: Record<Suit, number> = {
    spades: 0,
    hearts: 0,
    diamonds: 0,
    clubs: 0,
  };
  const byRank: Record<Rank, number> = {
    "2": 0, "3": 0, "4": 0, "5": 0, "6": 0, "7": 0, "8": 0, "9": 0,
    "10": 0, J: 0, Q: 0, K: 0, A: 0,
  };
  for (const card of remaining) {
    bySuit[card.suit] += 1;
    byRank[card.rank] += 1;
  }
  return { total: remaining.length, bySuit, byRank };
}

export function toModelState(input: ModelStateInput): ModelState {
  return {
    hand: input.dealt.hand.map(toModelHandCard),
    jokers: input.jokers.map(toModelJoker),
    blind: toModelBlind(input),
    ante: input.ante,
    round: input.round,
    stake: input.selectedStake,
    money: input.money,
    remainingHands: input.remainingHands,
    remainingDiscards: input.remainingDiscards,
    roundScore: input.roundScore,
    deck: toDeckComposition(input.dealt.remaining),
  };
}
