// @vitest-environment node
import {
  SELTZER_HANDS,
  applyHandPlayedToJokerStates,
  createJokerCatalog,
  createSeltzerJoker,
  expandScoringRetriggers,
} from "../jokers";
import type { Joker } from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

const handCtx = {
  playedHandLabel: "Pair",
  playedCardCount: 2,
  scoredCards: [],
} as const;

function afterHands(joker: Joker, hands: number): Joker[] {
  let jokers: Joker[] = [joker];
  for (let i = 0; i < hands; i += 1) {
    jokers = applyHandPlayedToJokerStates(jokers, handCtx);
  }
  return jokers;
}

beforeEach(() => {
  nextId = 0;
});

describe("Seltzer (#920)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("seltzer");
  });

  test("starts with SELTZER_HANDS charges", () => {
    expect(createSeltzerJoker().state).toEqual({
      kind: "counter",
      value: SELTZER_HANDS,
    });
  });

  test("retriggers every played card while charged", () => {
    const cards = [card("A"), card("K")];
    const scoring = expandScoringRetriggers(cards, [createSeltzerJoker()]);
    expect(scoring).toHaveLength(4);
  });

  test("each played hand consumes one charge", () => {
    const [after] = afterHands(createSeltzerJoker(), 3);
    expect(after.state).toEqual({
      kind: "counter",
      value: SELTZER_HANDS - 3,
    });
  });

  test("self-destructs after its final hand", () => {
    expect(afterHands(createSeltzerJoker(), SELTZER_HANDS)).toHaveLength(0);
  });

  test("survives the hand before depletion (negative)", () => {
    expect(afterHands(createSeltzerJoker(), SELTZER_HANDS - 1)).toHaveLength(1);
  });

  test("a depleted Seltzer no longer retriggers (negative)", () => {
    const depleted: Joker = {
      ...createSeltzerJoker(),
      stickers: [{ kind: "eternal" }],
      state: { kind: "counter", value: 0 },
    };
    const scoring = expandScoringRetriggers([card("A")], [depleted]);
    expect(scoring).toHaveLength(1);
  });

  test("stacks additively with a red seal", () => {
    const sealed: Card = { ...card("A"), seal: "red" };
    const scoring = expandScoringRetriggers([sealed], [createSeltzerJoker()]);
    expect(scoring).toHaveLength(3);
  });
});
