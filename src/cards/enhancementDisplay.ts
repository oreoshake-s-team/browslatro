import {
  BONUS_ENHANCEMENT_CHIPS,
  GLASS_ENHANCEMENT_MULT_TIMES,
  MULT_ENHANCEMENT_MULT_DELTA,
} from "./enhancements";
import { GOLD_HELD_BONUS_PER_CARD } from "../scoring/payout";
import { STEEL_MULT_FACTOR } from "./heldInHand";
import type { Enhancement } from "./types";

export type EnhancementValueColor = "chips" | "mult" | "money";

export interface EnhancementDisplayValue {
  readonly text: string;
  readonly color: EnhancementValueColor;
}

export function enhancementDisplayValue(
  enhancement: Enhancement,
): EnhancementDisplayValue | null {
  switch (enhancement) {
    case "bonus":
      return { text: `+${BONUS_ENHANCEMENT_CHIPS}`, color: "chips" };
    case "mult":
      return { text: `+${MULT_ENHANCEMENT_MULT_DELTA}`, color: "mult" };
    case "glass":
      return { text: `×${GLASS_ENHANCEMENT_MULT_TIMES}`, color: "mult" };
    case "steel":
      return { text: `×${STEEL_MULT_FACTOR}`, color: "mult" };
    case "gold":
      return { text: `+$${GOLD_HELD_BONUS_PER_CARD}`, color: "money" };
    case "wild":
    case "stone":
    case "lucky":
      return null;
    default: {
      const exhausted: never = enhancement;
      throw new Error(`Unhandled enhancement: ${JSON.stringify(exhausted)}`);
    }
  }
}
