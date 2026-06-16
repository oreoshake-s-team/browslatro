import type { BlindAdviceCandidate } from "./types";

export interface BlindCoachInput {
  readonly ante: number;
  readonly jokerCount: number;
  readonly candidates: ReadonlyArray<BlindAdviceCandidate>;
}

// Skip tags worth giving up a blind's money + shop for, when you can already
// coast. Curated from the genuinely build-defining / high-economy tags.
const STRONG_SKIP_TAG_IDS: ReadonlySet<string> = new Set([
  "investment",
  "rare",
  "negative",
  "foil",
  "holographic",
  "polychrome",
  "double",
  "voucher",
  "charm",
]);

/**
 * Rule-based local coach for the blind play-vs-skip decision.
 *
 * Skipping forgoes the blind's cash and the shop that follows, so you only skip
 * a blind you can comfortably win, for a tag worth more than that shop. This
 * recommends Skip only when the offered tag is strong AND the build is ahead of
 * the curve (a proxy for "winnable, can coast without this shop"); otherwise
 * Play. It never recommends skipping because a blind looks hard.
 *
 * Returns candidate indices best-first (the recommended action leads).
 */
export function rankBlind(input: BlindCoachInput): ReadonlyArray<number> {
  const playIdx = input.candidates.findIndex((c) => c.action === "play");
  const skipIdx = input.candidates.findIndex((c) => c.action === "skip");
  const skip = skipIdx >= 0 ? input.candidates[skipIdx] : undefined;
  const strongTag =
    skip?.action === "skip" && STRONG_SKIP_TAG_IDS.has(skip.tag.id);
  const canCoast = input.jokerCount >= input.ante - 1;
  const order =
    strongTag && canCoast ? [skipIdx, playIdx] : [playIdx, skipIdx];
  return order.filter((i) => i >= 0);
}
