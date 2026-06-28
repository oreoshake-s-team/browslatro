// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  encodePackCandidates,
  encodePackCandidatesV2,
  encodeShopCandidates,
  encodeShopCandidatesV2,
  shopBuildSummary,
  SHOP_BUILD_FEATURES,
  SHOP_INPUT_FEATURES,
  SHOP_INPUT_FEATURES_V2,
} from "./shopEncoding";
import type { PackRankInput, ShopBuild, ShopRankInput } from "./shopEncoding";
import type { PackAdviceCandidate, ShopAdviceCandidate } from "./types";
import type { Card } from "../../cards/types";
import { createDefaultHandStats } from "../../scoring/handStats";
import { createJokerCatalog } from "../../items/jokers";

function buyCandidate(): ShopAdviceCandidate {
  return {
    action: "buy",
    item: {
      id: "j_jolly",
      name: "Jolly Joker",
      itemType: "joker",
      category: "joker-mult",
      cost: 4,
      description: "test",
    },
  };
}

function rerollCandidate(): ShopAdviceCandidate {
  return { action: "reroll", cost: 5 };
}

function useCandidate(): ShopAdviceCandidate {
  return {
    action: "use",
    item: {
      id: "c_star",
      name: "The Star",
      itemType: "tarot",
      category: "tarot-deck",
      cost: 0,
      description: "test",
    },
  };
}

function leaveCandidate(): ShopAdviceCandidate {
  return { action: "leave" };
}

function pickCandidate(): PackAdviceCandidate {
  return {
    action: "pick",
    option: { id: "c_star", name: "The Star", optionType: "tarot", category: "tarot-deck", description: "test" },
  };
}

function skipCandidate(): PackAdviceCandidate {
  return { action: "skip" };
}

describe("SHOP_INPUT_FEATURES", () => {
  test("equals 78", () => {
    expect(SHOP_INPUT_FEATURES).toBe(78);
  });
});

describe("encodeShopCandidatesV2", () => {
  const rankInput = (candidate: ShopAdviceCandidate): ShopRankInput => ({
    money: 10,
    ante: 1,
    round: 0,
    candidates: [candidate],
  });

  test("adds exactly one feature over the v1 width", () => {
    expect(SHOP_INPUT_FEATURES_V2).toBe(SHOP_INPUT_FEATURES + 1);
  });

  test("emits one v2-width row per candidate", () => {
    const encoded = encodeShopCandidatesV2(rankInput(buyCandidate()));
    expect(encoded.length).toBe(SHOP_INPUT_FEATURES_V2);
  });

  test("sets the trailing use flag for a use candidate", () => {
    const encoded = encodeShopCandidatesV2(rankInput(useCandidate()));
    expect(encoded[SHOP_INPUT_FEATURES_V2 - 1]).toBe(1);
  });

  test("leaves the use flag unset for a buy candidate", () => {
    const encoded = encodeShopCandidatesV2(rankInput(buyCandidate()));
    expect(encoded[SHOP_INPUT_FEATURES_V2 - 1]).toBe(0);
  });

  test("reuses the v1 encoding as the row prefix", () => {
    const v1 = encodeShopCandidates(rankInput(buyCandidate()));
    const v2 = encodeShopCandidatesV2(rankInput(buyCandidate()));
    expect(Array.from(v2.slice(0, SHOP_INPUT_FEATURES))).toEqual(
      Array.from(v1),
    );
  });
});

describe("encodePackCandidatesV2", () => {
  const packInput = (candidate: PackAdviceCandidate): PackRankInput => ({
    money: 10,
    ante: 1,
    round: 0,
    picksRemaining: 1,
    candidates: [candidate],
  });

  test("emits one v2-width row per candidate", () => {
    const encoded = encodePackCandidatesV2(packInput(pickCandidate()));
    expect(encoded.length).toBe(SHOP_INPUT_FEATURES_V2);
  });

  test("leaves the use flag unset for a pack pick", () => {
    const encoded = encodePackCandidatesV2(packInput(pickCandidate()));
    expect(encoded[SHOP_INPUT_FEATURES_V2 - 1]).toBe(0);
  });

  test("reuses the v1 pack encoding as the row prefix", () => {
    const v1 = encodePackCandidates(packInput(pickCandidate()));
    const v2 = encodePackCandidatesV2(packInput(pickCandidate()));
    expect(Array.from(v2.slice(0, SHOP_INPUT_FEATURES))).toEqual(
      Array.from(v1),
    );
  });
});

describe("shopBuildSummary", () => {
  test("counts deck enhancements by type", () => {
    const deck: Card[] = [
      { id: 1, rank: "A", suit: "hearts", enhancement: "glass" },
      { id: 2, rank: "K", suit: "spades", enhancement: "glass" },
      { id: 3, rank: "Q", suit: "clubs" },
    ];
    const summary = shopBuildSummary({ jokers: [], handStats: createDefaultHandStats(), deck, consumablesHeld: 0 });
    expect(summary.deckEnhancements.glass).toBe(2);
  });

  test("summarizes an owned joker by effect kind and rarity", () => {
    const joker = createJokerCatalog()[0];
    const summary = shopBuildSummary({ jokers: [joker], handStats: createDefaultHandStats(), deck: [], consumablesHeld: 0 });
    expect(summary.jokers[0]).toEqual({ effectKind: joker.effect.kind, rarity: joker.rarity });
  });
});

describe("encodeShopCandidates", () => {
  test("produces a row of SHOP_INPUT_FEATURES per candidate", () => {
    const input: ShopRankInput = {
      money: 10,
      ante: 2,
      round: 3,
      candidates: [buyCandidate(), rerollCandidate(), leaveCandidate()],
    };
    const encoded = encodeShopCandidates(input);
    expect(encoded.length).toBe(3 * SHOP_INPUT_FEATURES);
  });

  test("encodes context features in the first 4 values", () => {
    const input: ShopRankInput = {
      money: 20,
      ante: 8,
      round: 24,
      candidates: [buyCandidate()],
    };
    const encoded = encodeShopCandidates(input);
    expect(encoded[0]).toBeCloseTo(1.0);
    expect(encoded[1]).toBeCloseTo(1.0);
    expect(encoded[2]).toBeCloseTo(1.0);
    expect(encoded[3]).toBeCloseTo(0.0);
  });

  test("sets can_afford=1 when money >= cost", () => {
    const candidate: ShopAdviceCandidate = {
      action: "buy",
      item: { id: "j", name: "J", itemType: "joker", category: "joker-mult", cost: 4, description: "d" },
    };
    const input: ShopRankInput = { money: 10, ante: 1, round: 0, candidates: [candidate] };
    const encoded = encodeShopCandidates(input);
    const canAffordIndex = 4 + SHOP_BUILD_FEATURES + 7 + 1;
    expect(encoded[canAffordIndex]).toBe(1);
  });

  test("sets can_afford=0 when money < cost", () => {
    const candidate: ShopAdviceCandidate = {
      action: "buy",
      item: { id: "j", name: "J", itemType: "joker", category: "joker-mult", cost: 20, description: "d" },
    };
    const input: ShopRankInput = { money: 5, ante: 1, round: 0, candidates: [candidate] };
    const encoded = encodeShopCandidates(input);
    const canAffordIndex = 4 + SHOP_BUILD_FEATURES + 7 + 1;
    expect(encoded[canAffordIndex]).toBe(0);
  });

  test("marks reroll candidate with is_reroll=1", () => {
    const input: ShopRankInput = {
      money: 10,
      ante: 1,
      round: 0,
      candidates: [rerollCandidate()],
    };
    const encoded = encodeShopCandidates(input);
    const isRerollIndex = 4 + SHOP_BUILD_FEATURES + 7 + 1 + 1;
    expect(encoded[isRerollIndex]).toBe(1);
  });

  test("marks leave candidate with is_leave=1", () => {
    const input: ShopRankInput = {
      money: 5,
      ante: 1,
      round: 0,
      candidates: [leaveCandidate()],
    };
    const encoded = encodeShopCandidates(input);
    const isLeaveIndex = 4 + SHOP_BUILD_FEATURES + 7 + 1 + 1 + 1;
    expect(encoded[isLeaveIndex]).toBe(1);
  });

  test("returns empty array for no candidates", () => {
    const input: ShopRankInput = { money: 5, ante: 1, round: 0, candidates: [] };
    expect(encodeShopCandidates(input).length).toBe(0);
  });
});

describe("encodePackCandidates", () => {
  test("produces a row of SHOP_INPUT_FEATURES per candidate", () => {
    const input: PackRankInput = {
      money: 10,
      ante: 2,
      round: 3,
      picksRemaining: 2,
      candidates: [pickCandidate(), skipCandidate()],
    };
    const encoded = encodePackCandidates(input);
    expect(encoded.length).toBe(2 * SHOP_INPUT_FEATURES);
  });

  test("encodes picksRemaining in context slot 4", () => {
    const input: PackRankInput = {
      money: 0,
      ante: 0,
      round: 0,
      picksRemaining: 5,
      candidates: [pickCandidate()],
    };
    const encoded = encodePackCandidates(input);
    expect(encoded[3]).toBeCloseTo(1.0);
  });

  test("marks skip candidate with is_skip=1", () => {
    const input: PackRankInput = {
      money: 5,
      ante: 1,
      round: 0,
      picksRemaining: 1,
      candidates: [skipCandidate()],
    };
    const encoded = encodePackCandidates(input);
    const isSkipIndex = 4 + SHOP_BUILD_FEATURES + 7 + 1 + 1 + 1 + 1;
    expect(encoded[isSkipIndex]).toBe(1);
  });
});

const FIXTURES = join(__dirname, "..", "..", "..", "ml", "tests", "fixtures");

interface GoldenOffer {
  readonly itemType: string;
  readonly category: string;
  readonly attributes?: ReadonlyArray<number>;
  readonly id: string;
  readonly name: string;
  readonly cost: number;
}

interface GoldenOption {
  readonly optionType: string;
  readonly category: string;
  readonly attributes?: ReadonlyArray<number>;
  readonly id: string;
  readonly name: string;
}

interface GoldenRecord {
  readonly kind: "purchase" | "reroll" | "pack-pick";
  readonly money: number;
  readonly ante: number;
  readonly round: number;
  readonly picksRemaining?: number;
  readonly offers?: ReadonlyArray<GoldenOffer>;
  readonly options?: ReadonlyArray<GoldenOption>;
  readonly cost?: number;
  readonly handLevels?: Readonly<Record<string, number>>;
  readonly jokers?: ReadonlyArray<{ effectKind: string; rarity: string }>;
  readonly deckEnhancements?: Readonly<Record<string, number>>;
  readonly consumablesHeld?: number;
}

function buildFromGolden(rec: GoldenRecord): ShopBuild {
  return {
    handLevels: rec.handLevels ?? {},
    jokers: rec.jokers ?? [],
    deckEnhancements: rec.deckEnhancements ?? {},
    consumablesHeld: rec.consumablesHeld ?? 0,
  };
}

interface GoldenCase {
  readonly record: GoldenRecord;
  readonly candidates: ReadonlyArray<ReadonlyArray<number>>;
  readonly chosenIndex: number;
}

function recordToInput(rec: GoldenRecord): ShopRankInput | PackRankInput {
  const { money, ante, round } = rec;

  if (rec.kind === "purchase") {
    const candidates: ShopAdviceCandidate[] = (rec.offers ?? []).map((o) => ({
      action: "buy" as const,
      item: { id: o.id, name: o.name, itemType: o.itemType, category: o.category, attributes: o.attributes, cost: o.cost, description: "" },
    }));
    candidates.push({ action: "leave" });
    return { money, ante, round, build: buildFromGolden(rec), candidates };
  }

  if (rec.kind === "reroll") {
    const candidates: ShopAdviceCandidate[] = (rec.offers ?? []).map((o) => ({
      action: "buy" as const,
      item: { id: o.id, name: o.name, itemType: o.itemType, category: o.category, attributes: o.attributes, cost: o.cost, description: "" },
    }));
    candidates.push({ action: "reroll", cost: rec.cost ?? 0 });
    candidates.push({ action: "leave" });
    return { money, ante, round, build: buildFromGolden(rec), candidates };
  }

  const packCandidates: PackAdviceCandidate[] = (rec.options ?? []).map((o) => ({
    action: "pick" as const,
    option: { id: o.id, name: o.name, optionType: o.optionType, category: o.category, attributes: o.attributes, description: "" },
  }));
  packCandidates.push({ action: "skip" });
  return { money, ante, round, picksRemaining: rec.picksRemaining ?? 0, build: buildFromGolden(rec), candidates: packCandidates };
}

describe("encodeShopCandidates / encodePackCandidates — cross-language golden vectors", () => {
  function goldenCases(): ReadonlyArray<GoldenCase> {
    return JSON.parse(
      readFileSync(join(FIXTURES, "shop-golden.json"), "utf8"),
    ) as GoldenCase[];
  }

  test("matches the Python encoder on all fixture cases", () => {
    for (const { record, candidates: expected } of goldenCases()) {
      const input = recordToInput(record);
      const encoded =
        record.kind === "pack-pick"
          ? encodePackCandidates(input as PackRankInput)
          : encodeShopCandidates(input as ShopRankInput);
      expect(encoded.length).toBe(expected.length * SHOP_INPUT_FEATURES);
      for (let i = 0; i < expected.length; i++) {
        for (let j = 0; j < SHOP_INPUT_FEATURES; j++) {
          expect(encoded[i * SHOP_INPUT_FEATURES + j]).toBeCloseTo(
            expected[i][j],
            5,
          );
        }
      }
    }
  });

  test("fixture covers purchase, reroll, and pack-pick cases", () => {
    const kinds = goldenCases().map((c) => c.record.kind);
    expect(kinds).toContain("purchase");
    expect(kinds).toContain("reroll");
    expect(kinds).toContain("pack-pick");
  });
});
