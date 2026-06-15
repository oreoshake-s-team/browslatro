// @vitest-environment node
import { advanceStackGainsForScoring } from "./state";
import { GREEN_JOKER_MULT_PER_HAND } from "./constants";
import {
  createGreenJokerJoker,
  createLoyaltyCardJoker,
  createRideTheBusJoker,
  createRunnerJoker,
  createSpareTrousersJoker,
  createSquareJokerJoker,
  createWeeJokerJoker,
} from "./factories";
import type { Joker } from "./types";
import type { Card } from "../../cards/types";

let nextId = 1;
function card(rank: Card["rank"], suit: Card["suit"] = "clubs"): Card {
  return { id: nextId++, rank, suit };
}

function counter(joker: Joker): number | null {
  return joker.state?.kind === "counter" ? joker.state.value : null;
}

const baseCtx = {
  playedHandLabel: "Two Pair" as const,
  playedCardCount: 4,
  scoredCards: [] as Card[],
};

describe("advanceStackGainsForScoring", () => {
  test("advances Spare Trousers when the played hand contains Two Pair", () => {
    const [advanced] = advanceStackGainsForScoring(
      [createSpareTrousersJoker()],
      baseCtx,
    );
    expect(counter(advanced)).toBe(2);
  });

  test("does NOT advance Spare Trousers on a non-matching hand (negative)", () => {
    const [advanced] = advanceStackGainsForScoring([createSpareTrousersJoker()], {
      ...baseCtx,
      playedHandLabel: "High Card",
    });
    expect(counter(advanced)).toBe(0);
  });

  test("advances Runner when the played hand contains a Straight", () => {
    const [advanced] = advanceStackGainsForScoring([createRunnerJoker()], {
      ...baseCtx,
      playedHandLabel: "Straight",
    });
    expect(counter(advanced)).toBeGreaterThan(0);
  });

  test("advances Square Joker when exactly four cards are played", () => {
    const [advanced] = advanceStackGainsForScoring([createSquareJokerJoker()], {
      ...baseCtx,
      playedCardCount: 4,
    });
    expect(counter(advanced)).toBeGreaterThan(0);
  });

  test("does NOT advance Square Joker when the card count differs (negative)", () => {
    const [advanced] = advanceStackGainsForScoring([createSquareJokerJoker()], {
      ...baseCtx,
      playedCardCount: 5,
    });
    expect(counter(advanced)).toBe(0);
  });

  test("advances Wee Joker per scored 2", () => {
    const [advanced] = advanceStackGainsForScoring([createWeeJokerJoker()], {
      ...baseCtx,
      scoredCards: [card("2"), card("2"), card("9")],
    });
    expect(counter(advanced)).toBeGreaterThan(0);
  });

  test("advances Ride the Bus when no face card is scored", () => {
    const [advanced] = advanceStackGainsForScoring([createRideTheBusJoker()], {
      ...baseCtx,
      scoredCards: [card("9"), card("2")],
    });
    expect(counter(advanced)).toBeGreaterThan(0);
  });

  test("resets Ride the Bus when a face card is scored", () => {
    const grown: Joker = {
      ...createRideTheBusJoker(),
      state: { kind: "counter", value: 5 },
    };
    const [advanced] = advanceStackGainsForScoring([grown], {
      ...baseCtx,
      scoredCards: [card("K")],
    });
    expect(counter(advanced)).toBe(0);
  });

  test("advances Green Joker on any hand played", () => {
    const [advanced] = advanceStackGainsForScoring([createGreenJokerJoker()], baseCtx);
    expect(counter(advanced)).toBe(GREEN_JOKER_MULT_PER_HAND);
  });

  test("leaves a non-gains counter joker untouched (negative — every-n-hands)", () => {
    const loyalty: Joker = {
      ...createLoyaltyCardJoker(),
      state: { kind: "counter", value: 3 },
    };
    const [advanced] = advanceStackGainsForScoring([loyalty], baseCtx);
    expect(counter(advanced)).toBe(3);
  });
});
