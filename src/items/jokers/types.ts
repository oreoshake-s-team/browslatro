import type { Enhancement, Rank, Suit } from "../../cards/types";
import type { HandLabel } from "../../scoring/handEvaluator";

export type RandomSource = () => number;

export type JokerEffect =
  | { readonly kind: "additive-mult"; readonly amount: number }
  | { readonly kind: "business-card"; readonly chance: number; readonly payout: number }
  | { readonly kind: "stencil" }
  | { readonly kind: "per-suit-mult"; readonly suit: Suit; readonly amount: number }
  | {
      readonly kind: "on-hand-type-mult";
      readonly requires: HandLabel;
      readonly amount: number;
    }
  | {
      readonly kind: "on-hand-type-chips";
      readonly requires: HandLabel;
      readonly amount: number;
    }
  | {
      readonly kind: "on-hand-type-x-mult";
      readonly requires: HandLabel;
      readonly amount: number;
    }
  | {
      readonly kind: "per-scored-rank-parity";
      readonly parity: "even" | "odd";
      readonly contribution:
        | { readonly kind: "mult"; readonly amount: number }
        | { readonly kind: "chips"; readonly amount: number };
    }
  | {
      readonly kind: "additive-mult-when-hand-size";
      readonly maxCardsPlayed: number;
      readonly amount: number;
    }
  | {
      readonly kind: "additive-mult-random";
      readonly min: number;
      readonly max: number;
    }
  | {
      readonly kind: "per-scored-face";
      readonly contribution:
        | { readonly kind: "mult"; readonly amount: number }
        | { readonly kind: "chips"; readonly amount: number };
    }
  | {
      readonly kind: "x-mult-on-face-scored";
      readonly amount: number;
    }
  | {
      readonly kind: "per-scored-rank";
      readonly ranks: ReadonlyArray<Rank>;
      readonly mult?: number;
      readonly chips?: number;
    }
  | { readonly kind: "per-remaining-discard-chips"; readonly amount: number }
  | { readonly kind: "mult-when-no-discards"; readonly amount: number }
  | { readonly kind: "per-dollar-chips"; readonly amount: number }
  | {
      readonly kind: "per-held-rank";
      readonly ranks: ReadonlyArray<Rank>;
      readonly mult?: number;
      readonly xMult?: number;
    }
  | {
      readonly kind: "held-lowest-rank-mult";
      readonly multiplier: number;
    }
  | { readonly kind: "per-joker-count-mult"; readonly amount: number }
  | {
      readonly kind: "per-money-bucket-mult";
      readonly bucket: number;
      readonly amount: number;
    }
  | {
      readonly kind: "x-mult-when-held-suits-all-in";
      readonly suits: ReadonlyArray<Suit>;
      readonly amount: number;
    }
  | {
      readonly kind: "per-suit-chance-x-mult";
      readonly suit: Suit;
      readonly chance: number;
      readonly amount: number;
    }
  | { readonly kind: "other-jokers-sell-value-mult" }
  | {
      readonly kind: "per-held-face-chance-money";
      readonly chance: number;
      readonly payout: number;
    }
  | {
      readonly kind: "per-scored-rank-x-mult";
      readonly ranks: ReadonlyArray<Rank>;
      readonly amount: number;
    }
  | { readonly kind: "x-mult-on-final-hand"; readonly amount: number }
  | { readonly kind: "per-suit-chips"; readonly suit: Suit; readonly amount: number }
  | { readonly kind: "per-suit-money"; readonly suit: Suit; readonly amount: number }
  | {
      readonly kind: "per-enhanced-in-deck-chips";
      readonly enhancement: Enhancement;
      readonly amount: number;
    }
  | {
      readonly kind: "per-enhanced-in-deck-x-mult";
      readonly enhancement: Enhancement;
      readonly amount: number;
    }
  | {
      readonly kind: "x-mult-when-enhanced-count-at-least";
      readonly threshold: number;
      readonly amount: number;
    }
  | {
      readonly kind: "on-discard-money-when-face-count-at-least";
      readonly threshold: number;
      readonly payout: number;
    }
  | {
      readonly kind: "on-first-discard-of-round-money-when-size";
      readonly size: number;
      readonly payout: number;
    }
  | { readonly kind: "end-of-round-money"; readonly amount: number }
  | {
      readonly kind: "per-remaining-discard-end-of-round-money";
      readonly amount: number;
    }
  | {
      readonly kind: "per-rank-in-deck-end-of-round-money";
      readonly ranks: ReadonlyArray<Rank>;
      readonly amount: number;
    }
  | { readonly kind: "per-missing-card-mult"; readonly amount: number }
  | {
      readonly kind: "per-remaining-deck-card-chips";
      readonly amount: number;
    }
  | { readonly kind: "x-mult-per-uncommon-joker"; readonly amount: number }
  | { readonly kind: "all-suits-x-mult"; readonly amount: number }
  | {
      readonly kind: "x-mult-when-clubs-and-other-suit";
      readonly amount: number;
    }
  | {
      readonly kind: "passive-run-stats";
      readonly handSize?: number;
      readonly hands?: number;
      readonly discards?: number;
      readonly discardsOverride?: number;
      readonly additiveChips?: number;
      readonly debtFloor?: number;
      readonly allCardsFace?: boolean;
      readonly allCardsScore?: boolean;
      readonly astronomer?: boolean;
      readonly chaosTheClown?: boolean;
      readonly fourFingers?: boolean;
      readonly shortcut?: boolean;
      readonly smearedSuits?: boolean;
      readonly probabilityMultiplier?: number;
    }
  | { readonly kind: "per-hand-play-count-mult" }
  | {
      readonly kind: "on-hand-type-stack-mult";
      readonly requires: HandLabel;
      readonly amount: number;
    }
  | {
      readonly kind: "on-hand-type-stack-chips";
      readonly requires: HandLabel;
      readonly amount: number;
    }
  | {
      readonly kind: "on-played-card-count-stack-chips";
      readonly count: number;
      readonly amount: number;
    }
  | {
      readonly kind: "on-played-rank-stack-chips";
      readonly ranks: ReadonlyArray<Rank>;
      readonly amount: number;
    }
  | {
      readonly kind: "on-no-face-stack-mult";
      readonly amount: number;
    }
  | {
      readonly kind: "every-n-hands-xmult";
      readonly n: number;
      readonly xmult: number;
    }
  | {
      readonly kind: "on-hand-stack-on-discard-shrink-mult";
      readonly growAmount: number;
      readonly shrinkAmount: number;
    }
  | { readonly kind: "stack-mult-on-shop-reroll"; readonly amount: number }
  | { readonly kind: "x-mult-on-repeat-hand-this-round"; readonly amount: number }
  | { readonly kind: "x-mult-per-blind-skipped"; readonly amount: number }
  | { readonly kind: "x-mult-per-added-card"; readonly amount: number }
  | {
      readonly kind: "chips-melt-per-hand";
      readonly amount: number;
      readonly lossPerHand: number;
    }
  | {
      readonly kind: "mult-decay-per-round";
      readonly amount: number;
      readonly lossPerRound: number;
    }
  | {
      readonly kind: "x-mult-shrink-per-discarded-card";
      readonly base: number;
      readonly lossPerCard: number;
    }
  | {
      readonly kind: "additive-mult-chance-bust";
      readonly amount: number;
      readonly bustChance: number;
    }
  | {
      readonly kind: "retrigger-ranks";
      readonly ranks: ReadonlyArray<Rank>;
      readonly times: number;
    }
  | { readonly kind: "retrigger-face-cards"; readonly times: number }
  | { readonly kind: "retrigger-first-card"; readonly times: number }
  | { readonly kind: "retrigger-on-final-hand"; readonly times: number }
  | { readonly kind: "stack-mult-on-pack-skip"; readonly amount: number }
  | {
      readonly kind: "x-mult-per-jack-discarded-this-round";
      readonly amount: number;
    }
  | { readonly kind: "x-mult-per-lucky-trigger"; readonly amount: number }
  | { readonly kind: "sell-value-grows-per-round"; readonly amount: number }
  | { readonly kind: "stack-mult-per-tarot-used"; readonly amount: number }
  | { readonly kind: "x-mult-per-planet-used"; readonly amount: number }
  | { readonly kind: "x-mult-per-sold-card"; readonly amount: number }
  | {
      readonly kind: "x-mult-per-hand-without-most-played";
      readonly amount: number;
    }
  | {
      readonly kind: "end-of-round-money-grows-on-boss";
      readonly baseAmount: number;
      readonly growth: number;
    }
  | { readonly kind: "extra-interest-per-five" }
  | { readonly kind: "sell-creates-double-tag" }
  | {
      readonly kind: "hand-size-decay-per-round";
      readonly amount: number;
      readonly lossPerRound: number;
    }
  | {
      readonly kind: "retrigger-all-depleting";
      readonly times: number;
      readonly hands: number;
    }
  | { readonly kind: "retrigger-held-abilities"; readonly times: number }
  | { readonly kind: "played-faces-become-gold" }
  | {
      readonly kind: "x-mult-per-enhancement-eaten";
      readonly amount: number;
    }
  | { readonly kind: "scored-cards-gain-chips"; readonly amount: number }
  | { readonly kind: "blind-select-adds-stone-card" }
  | {
      readonly kind: "x-mult-chance-bust";
      readonly amount: number;
      readonly bustChance: number;
    }
  | { readonly kind: "round-begin-adds-sealed-card" }
  | {
      readonly kind: "prevent-death-at-quarter";
      readonly threshold: number;
    }
  | { readonly kind: "sell-disables-boss-blind" }
  | { readonly kind: "disables-boss-blinds" }
  | { readonly kind: "x-mult-on-idol-card"; readonly amount: number }
  | { readonly kind: "x-mult-per-suit-rotating"; readonly amount: number }
  | {
      readonly kind: "stack-chips-per-rotating-suit-discard";
      readonly amount: number;
    }
  | {
      readonly kind: "scored-rank-chance-creates-tarot";
      readonly rank: Rank;
      readonly chance: number;
    }
  | {
      readonly kind: "hand-type-creates-spectral";
      readonly requires: HandLabel;
    }
  | { readonly kind: "first-hand-single-six-creates-spectral" }
  | { readonly kind: "ace-straight-creates-tarot" }
  | { readonly kind: "poor-hand-creates-tarot"; readonly threshold: number }
  | { readonly kind: "copy-right-joker" }
  | { readonly kind: "copy-leftmost-joker" };

export type JokerStateValue =
  | { readonly kind: "counter"; readonly value: number };

export type JokerEdition = "foil" | "holographic" | "polychrome" | "negative";

export interface JokerEditionInfo {
  readonly name: string;
  readonly description: string;
}

export type JokerRarity = "common" | "uncommon" | "rare" | "legendary";

export type JokerSticker =
  | { readonly kind: "eternal" }
  | { readonly kind: "perishable"; readonly roundsHeld: number }
  | { readonly kind: "rental" };

export type JokerStickerKind = JokerSticker["kind"];

export interface Joker {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly effect: JokerEffect;
  readonly rarity: JokerRarity;
  readonly edition?: JokerEdition;
  readonly stickers?: ReadonlyArray<JokerSticker>;
  readonly state?: JokerStateValue;
}
