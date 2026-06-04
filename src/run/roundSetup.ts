import type { Blind } from "../cards/types";
import {
  DEFAULT_STARTING_DISCARDS,
  DEFAULT_STARTING_HANDS,
  bossStartingDiscards,
  bossStartingHands,
  type BossBlind,
} from "../items/bosses";
import {
  deckStartingDiscardsDelta,
  deckStartingHandsDelta,
  type Deck,
} from "../items/decks";
import {
  extraStartingDiscardsFromJokers,
  extraStartingHandsFromJokers,
  type Joker,
} from "../items/jokers";
import {
  extraStartingDiscards,
  extraStartingHands,
  type VoucherId,
} from "../items/vouchers";

export interface StartingResourceContext {
  readonly blind: Blind;
  readonly boss: BossBlind | null;
  readonly ownedVoucherIds: ReadonlySet<VoucherId>;
  readonly deck: Deck;
  readonly jokers: ReadonlyArray<Joker>;
}

export function computeStartingHands(ctx: StartingResourceContext): number {
  const isBossRound = ctx.blind === 3;
  const base = isBossRound
    ? bossStartingHands(ctx.boss)
    : DEFAULT_STARTING_HANDS;
  return Math.max(
    1,
    base +
      extraStartingHands(ctx.ownedVoucherIds) +
      extraStartingHandsFromJokers(ctx.jokers) +
      deckStartingHandsDelta(ctx.deck),
  );
}

export function computeStartingDiscards(ctx: StartingResourceContext): number {
  const isBossRound = ctx.blind === 3;
  const base = isBossRound
    ? bossStartingDiscards(ctx.boss)
    : DEFAULT_STARTING_DISCARDS;
  return Math.max(
    0,
    base +
      extraStartingDiscards(ctx.ownedVoucherIds) +
      extraStartingDiscardsFromJokers(ctx.jokers) +
      deckStartingDiscardsDelta(ctx.deck),
  );
}
