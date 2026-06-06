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
      readonly fourFingers?: boolean;
      readonly shortcut?: boolean;
    };

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
}
