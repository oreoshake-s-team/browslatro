import type { TFunction } from "i18next";
import type { HandLabel } from "../scoring/handEvaluator";

const HAND_LABEL_KEYS = {
  "High Card": "hands.highCard",
  Pair: "hands.pair",
  "Two Pair": "hands.twoPair",
  "Three of a Kind": "hands.threeOfAKind",
  Straight: "hands.straight",
  Flush: "hands.flush",
  "Full House": "hands.fullHouse",
  "Four of a Kind": "hands.fourOfAKind",
  "Straight Flush": "hands.straightFlush",
  "Royal Flush": "hands.royalFlush",
  "Five of a Kind": "hands.fiveOfAKind",
  "Flush House": "hands.flushHouse",
  "Flush Five": "hands.flushFive",
} as const satisfies Record<HandLabel, string>;

export function isHandLabel(label: string): label is HandLabel {
  return label in HAND_LABEL_KEYS;
}

export function tHandLabel(t: TFunction, label: string): string {
  return isHandLabel(label) ? t(HAND_LABEL_KEYS[label]) : label;
}
