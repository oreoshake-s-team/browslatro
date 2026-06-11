import type { Blind } from "../../cards/types";
import type { BossBlind } from "../../items/bosses";
import type { Consumable } from "../../items/consumables";
import type { Joker } from "../../items/jokers";
import { hasStakeModifier, type Stake } from "../../items/stakes";
import {
  describeSkipOffer,
  type AnteSkipOffer,
  type AnteSkipOffers,
} from "../../items/tags";
import { requiredChipsForBlind } from "../../scoring/anteScaling";
import { consumableRefs, jokerRefs } from "./contextSnapshots";
import type { BlindAdviceRequest, BlindAdviceTag } from "./types";

export type BlindSuggestionAction =
  | { readonly kind: "play" }
  | { readonly kind: "skip" };

export interface BlindAdvicePlan {
  readonly request: BlindAdviceRequest;
  readonly actions: ReadonlyArray<BlindSuggestionAction>;
}

export interface BlindAdviceInput {
  readonly ante: number;
  readonly currentBlind: Blind;
  readonly boss: BossBlind;
  readonly stake?: Stake;
  readonly skipRewards?: Partial<AnteSkipOffers>;
  readonly money: number;
  readonly jokers: ReadonlyArray<Joker>;
  readonly consumables: ReadonlyArray<Consumable>;
}

function payoutFor(blind: Blind, stake?: Stake): number {
  if (
    blind === 1 &&
    stake &&
    hasStakeModifier(stake, "red-small-blind-no-reward")
  ) {
    return 0;
  }
  return blind + 2;
}

function offerTag(offer: AnteSkipOffer): BlindAdviceTag {
  const spec = describeSkipOffer(offer);
  return { id: offer.id, name: spec.name, description: spec.description };
}

export function buildBlindAdvicePlan(
  input: BlindAdviceInput,
): BlindAdvicePlan | null {
  if (input.currentBlind === 3) return null;
  const offer =
    input.currentBlind === 1
      ? input.skipRewards?.small
      : input.skipRewards?.big;
  if (offer === undefined) return null;
  const { ante, boss, stake } = input;
  const scoreTarget = requiredChipsForBlind({
    ante,
    blind: input.currentBlind,
    boss,
    stake,
  });
  const payout = payoutFor(input.currentBlind, stake);
  const upcomingOffer =
    input.currentBlind === 1 ? input.skipRewards?.big : undefined;
  return {
    request: {
      context: "blind",
      blind: {
        kind: input.currentBlind === 1 ? "small" : "big",
        ante,
        scoreTarget,
        payout,
        money: input.money,
        jokers: jokerRefs(input.jokers),
        consumables: consumableRefs(input.consumables),
        boss: {
          id: boss.id,
          name: boss.name,
          description: boss.description,
          scoreTarget: requiredChipsForBlind({ ante, blind: 3, boss, stake }),
        },
        otherSkipOffer:
          upcomingOffer === undefined
            ? null
            : { kind: "big", tag: offerTag(upcomingOffer) },
      },
      candidates: [
        { action: "play", scoreTarget, payout },
        { action: "skip", tag: offerTag(offer) },
      ],
    },
    actions: [{ kind: "play" }, { kind: "skip" }],
  };
}
