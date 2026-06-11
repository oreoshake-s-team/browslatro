// @vitest-environment node
import {
  ICE_CREAM_CHIPS,
  ICE_CREAM_CHIPS_LOSS_PER_HAND,
  applyHandLevelJokers,
  applyHandPlayedToJokerStates,
  createIceCreamJoker,
  createJokerCatalog,
} from "../jokers";
import type { Joker } from "../jokers";

const handCtx = {
  playedHandLabel: "Pair",
  playedCardCount: 2,
  scoredCards: [],
} as const;

function melted(joker: Joker, hands: number): Joker[] {
  let jokers: Joker[] = [joker];
  for (let i = 0; i < hands; i += 1) {
    jokers = applyHandPlayedToJokerStates(jokers, handCtx);
  }
  return jokers;
}

describe("Ice Cream", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("ice-cream");
  });

  test("starts at full chips", () => {
    expect(createIceCreamJoker().state).toEqual({
      kind: "counter",
      value: ICE_CREAM_CHIPS,
    });
  });

  test("contributes its current chips when scoring", () => {
    const result = applyHandLevelJokers([createIceCreamJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.additiveChips).toBe(ICE_CREAM_CHIPS);
  });

  test("loses chips for every hand played", () => {
    const [updated] = melted(createIceCreamJoker(), 1);
    expect(updated.state).toEqual({
      kind: "counter",
      value: ICE_CREAM_CHIPS - ICE_CREAM_CHIPS_LOSS_PER_HAND,
    });
  });

  test("melts away when the chips reach 0", () => {
    const hands = ICE_CREAM_CHIPS / ICE_CREAM_CHIPS_LOSS_PER_HAND;
    expect(melted(createIceCreamJoker(), hands)).toHaveLength(0);
  });

  test("survives the hand before it would melt (negative)", () => {
    const hands = ICE_CREAM_CHIPS / ICE_CREAM_CHIPS_LOSS_PER_HAND - 1;
    expect(melted(createIceCreamJoker(), hands)).toHaveLength(1);
  });

  test("an eternal Ice Cream is not destroyed at 0 chips", () => {
    const eternal: Joker = {
      ...createIceCreamJoker(),
      stickers: [{ kind: "eternal" }],
    };
    const hands = ICE_CREAM_CHIPS / ICE_CREAM_CHIPS_LOSS_PER_HAND;
    expect(melted(eternal, hands)).toHaveLength(1);
  });
});
