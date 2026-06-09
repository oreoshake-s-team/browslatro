// @vitest-environment node
import { afterEach } from "vitest";
import {
  applyJokersToScoring,
  createBusinessCardJoker,
  createOopsAllSixesJoker,
  createPlusFourMultJoker,
  probabilityMultiplierFromJokers,
} from "../jokers";
import { OOPS_ALL_SIXES_PROBABILITY_MULTIPLIER } from "./factories";
import type { JokerRarity } from "../jokers";
import { chanceOverrideConfig } from "../../dev/chanceOverride";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit = "spades"): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

afterEach(() => {
  chanceOverrideConfig.probabilityMultiplier = 1;
});

describe("Oops! All 6s factory", () => {
  test("is an uncommon joker", () => {
    expect(createOopsAllSixesJoker().rarity).toBe<JokerRarity>("uncommon");
  });

  test("uses the stable id 'oops-all-6s'", () => {
    expect(createOopsAllSixesJoker().id).toBe("oops-all-6s");
  });

  test("exposes a probabilityMultiplier of 2 on its passive-run-stats effect", () => {
    const joker = createOopsAllSixesJoker();
    expect(
      joker.effect.kind === "passive-run-stats"
        ? joker.effect.probabilityMultiplier
        : undefined,
    ).toBe(OOPS_ALL_SIXES_PROBABILITY_MULTIPLIER);
  });
});

describe("probabilityMultiplierFromJokers", () => {
  test("returns 1 when no jokers are equipped", () => {
    expect(probabilityMultiplierFromJokers([])).toBe(1);
  });

  test("returns 1 when no Oops! All 6s is equipped (negative)", () => {
    expect(probabilityMultiplierFromJokers([createPlusFourMultJoker()])).toBe(
      1,
    );
  });

  test("returns 2 with a single Oops! All 6s equipped", () => {
    expect(probabilityMultiplierFromJokers([createOopsAllSixesJoker()])).toBe(
      2,
    );
  });

  test("stacks multiplicatively with multiple copies (2 * 2 = 4)", () => {
    expect(
      probabilityMultiplierFromJokers([
        createOopsAllSixesJoker(),
        createOopsAllSixesJoker(),
      ]),
    ).toBe(4);
  });

  test("ignores other passive-run-stats jokers that lack a probabilityMultiplier", () => {
    expect(
      probabilityMultiplierFromJokers([
        createOopsAllSixesJoker(),
        createPlusFourMultJoker(),
      ]),
    ).toBe(2);
  });
});

describe("Oops! All 6s + Business Card integration", () => {
  test("Business Card procs on every face card when Oops doubles its 50% chance to 100%", () => {
    chanceOverrideConfig.probabilityMultiplier = 2;
    const rng = (): number => 0.99;
    const scored = [card("J"), card("Q"), card("K")];
    const result = applyJokersToScoring(
      [createOopsAllSixesJoker(), createBusinessCardJoker()],
      scored,
      rng,
    );
    expect(result.moneyEarned).toBe(3);
  });

  test("Business Card without Oops misses on the same rng (negative)", () => {
    chanceOverrideConfig.probabilityMultiplier = 1;
    const rng = (): number => 0.99;
    const scored = [card("J"), card("Q"), card("K")];
    const result = applyJokersToScoring(
      [createBusinessCardJoker()],
      scored,
      rng,
    );
    expect(result.moneyEarned).toBe(0);
  });
});
