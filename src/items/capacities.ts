import { HAND_SIZE } from "../cards/deck";
import { MAX_CONSUMABLE_SLOTS } from "./consumables";
import { deckJokerSlotsDelta, type Deck } from "./decks";
import {
  extraStartingHandSizeFromJokers,
  MAX_JOKERS,
  type Joker,
} from "./jokers";
import {
  extraConsumableSlots,
  extraHandSize,
  extraJokerSlots,
  type VoucherId,
} from "./vouchers";

export function jokerCapacityFor(
  ownedVoucherIds: ReadonlySet<VoucherId>,
  deck: Deck,
): number {
  return Math.max(
    0,
    MAX_JOKERS + extraJokerSlots(ownedVoucherIds) + deckJokerSlotsDelta(deck),
  );
}

export function consumableCapacityFor(
  ownedVoucherIds: ReadonlySet<VoucherId>,
): number {
  return MAX_CONSUMABLE_SLOTS + extraConsumableSlots(ownedVoucherIds);
}

export function handSizeFor(input: {
  readonly handSizeModifier: number;
  readonly ownedVoucherIds: ReadonlySet<VoucherId>;
  readonly jokers: ReadonlyArray<Joker>;
}): number {
  return Math.max(
    1,
    HAND_SIZE +
      input.handSizeModifier +
      extraHandSize(input.ownedVoucherIds) +
      extraStartingHandSizeFromJokers(input.jokers),
  );
}
