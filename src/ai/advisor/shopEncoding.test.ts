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
  SHOP_CANDIDATE_PACK_FEATURES,
  SHOP_CANDIDATE_WINCON_FEATURES,
  SHOP_INPUT_FEATURES,
  SHOP_INPUT_FEATURES_V2,
} from "./shopEncoding";
import { packFeatureVector } from "./packFeatures";
import type { PackPool, PackVariant } from "../../items/packs";
import type { PackRankInput, ShopBuild, ShopRankInput } from "./shopEncoding";
import type { PackAdviceCandidate, ShopAdviceCandidate } from "./types";
import { recordToInput, type GoldenCase } from "./shopGoldenRecords";
import type { Card } from "../../cards/types";
import { createDefaultHandStats } from "../../scoring/handStats";
import { createJokerCatalog } from "../../items/jokers";
import { VOUCHER_CATALOG } from "../../items/vouchers";
import {
  VOUCHER_FEATURES,
  voucherFeatureVector,
} from "./voucherFeatures";

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
  test("equals 111", () => {
    expect(SHOP_INPUT_FEATURES).toBe(111);
  });
});

describe("wincon features", () => {
  const WINCON = 3;
  const WINCON_START =
    SHOP_INPUT_FEATURES - SHOP_CANDIDATE_PACK_FEATURES - WINCON;
  function planetBuy(advancesHands: ReadonlyArray<string>): ShopAdviceCandidate {
    return {
      action: "buy",
      item: { id: "p", name: "Planet", itemType: "planet", category: "planet", advancesHands, cost: 3, description: "" },
    };
  }
  function encodeBuy(candidate: ShopAdviceCandidate, build?: ShopBuild): number[] {
    return Array.from(
      encodeShopCandidates({ money: 10, ante: 2, round: 3, build, candidates: [candidate] }),
    );
  }
  const flushBuild: ShopBuild = { handLevels: { Flush: 4 }, jokers: [], deckEnhancements: {}, consumablesHeld: 0 };

  test("advancesTopHand is 1 when the planet levels the current top hand", () => {
    const row = encodeBuy(planetBuy(["Flush"]), flushBuild);
    expect(row[WINCON_START]).toBe(1);
  });

  test("advancesTopHand is 0 when the planet levels a non-top hand", () => {
    const row = encodeBuy(planetBuy(["Pair"]), flushBuild);
    expect(row[WINCON_START]).toBe(0);
  });

  test("advancedHandLevel reflects the current level of the advanced hand", () => {
    const build: ShopBuild = { handLevels: { Pair: 5 }, jokers: [], deckEnhancements: {}, consumablesHeld: 0 };
    const row = encodeBuy(planetBuy(["Pair"]), build);
    expect(row[WINCON_START + 1]).toBeCloseTo((5 - 1) / 20, 6);
  });

  test("sameCategoryJokerOwned counts owned jokers of the offer's effect category", () => {
    const build: ShopBuild = { handLevels: {}, jokers: [{ effectKind: "additive-mult", rarity: "common" }], deckEnhancements: {}, consumablesHeld: 0 };
    const row = encodeBuy(buyCandidate(), build);
    expect(row[WINCON_START + 2]).toBeCloseTo(1 / 5, 6);
  });

  test("a leave candidate has a zero wincon block", () => {
    const row = encodeBuy(leaveCandidate(), flushBuild);
    expect(row.slice(WINCON_START, WINCON_START + WINCON)).toEqual([0, 0, 0]);
  });

  test("winconConcentration is 0 for an unleveled build", () => {
    const row = encodeBuy(planetBuy(["Flush"]));
    expect(row[4 + SHOP_BUILD_FEATURES - 1]).toBe(0);
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

function voucherBuyCandidate(voucherId: string): ShopAdviceCandidate {
  const voucher = VOUCHER_CATALOG.find((v) => v.id === voucherId);
  if (voucher === undefined) throw new Error(`unknown voucher ${voucherId}`);
  return {
    action: "buy",
    item: {
      id: voucher.id,
      name: voucher.name,
      itemType: "voucher",
      category: "other",
      voucherFeatures: voucherFeatureVector(voucher),
      cost: voucher.cost,
      description: "test",
    },
  };
}

describe("encodeShopCandidates — voucher features", () => {
  function voucherBlock(candidate: ShopAdviceCandidate): number[] {
    const encoded = encodeShopCandidates({
      money: 50,
      ante: 1,
      round: 0,
      candidates: [candidate],
    });
    const voucherEnd =
      SHOP_INPUT_FEATURES -
      SHOP_CANDIDATE_PACK_FEATURES -
      SHOP_CANDIDATE_WINCON_FEATURES;
    return Array.from(
      encoded.slice(voucherEnd - VOUCHER_FEATURES, voucherEnd),
    );
  }

  test("a voucher buy carries its voucher feature vector", () => {
    const voucher = VOUCHER_CATALOG.find((v) => v.id === "overstock");
    expect(voucherBlock(voucherBuyCandidate("overstock"))).toEqual(
      voucherFeatureVector(voucher!),
    );
  });

  test("distinct vouchers encode to distinct feature blocks", () => {
    expect(voucherBlock(voucherBuyCandidate("overstock"))).not.toEqual(
      voucherBlock(voucherBuyCandidate("grabber")),
    );
  });

  test("a non-voucher buy leaves the voucher block all zeros", () => {
    expect(voucherBlock(buyCandidate())).toEqual(
      new Array(VOUCHER_FEATURES).fill(0),
    );
  });

  test("a reroll candidate leaves the voucher block all zeros", () => {
    expect(voucherBlock(rerollCandidate())).toEqual(
      new Array(VOUCHER_FEATURES).fill(0),
    );
  });
});

function packBuyCandidate(
  pool: PackPool,
  variant: PackVariant,
): ShopAdviceCandidate {
  return {
    action: "buy",
    item: {
      id: `${pool}-${variant}`,
      name: `${variant} ${pool} pack`,
      itemType: "pack",
      category: "other",
      packFeatures: packFeatureVector(pool, variant),
      cost: 6,
      description: "test",
    },
  };
}

describe("encodeShopCandidates — pack features", () => {
  function packBlock(candidate: ShopAdviceCandidate): number[] {
    const encoded = encodeShopCandidates({
      money: 50,
      ante: 1,
      round: 0,
      candidates: [candidate],
    });
    return Array.from(encoded.slice(SHOP_INPUT_FEATURES - SHOP_CANDIDATE_PACK_FEATURES));
  }

  test("a pack buy carries its pack feature vector", () => {
    expect(packBlock(packBuyCandidate("arcana", "mega"))).toEqual(
      packFeatureVector("arcana", "mega"),
    );
  });

  test("distinct packs encode to distinct pack blocks", () => {
    expect(packBlock(packBuyCandidate("arcana", "mega"))).not.toEqual(
      packBlock(packBuyCandidate("celestial", "normal")),
    );
  });

  test("a non-pack buy leaves the pack block all zeros", () => {
    expect(packBlock(buyCandidate())).toEqual(
      new Array(SHOP_CANDIDATE_PACK_FEATURES).fill(0),
    );
  });

  test("a reroll candidate leaves the pack block all zeros", () => {
    expect(packBlock(rerollCandidate())).toEqual(
      new Array(SHOP_CANDIDATE_PACK_FEATURES).fill(0),
    );
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

describe("encodeShopCandidatesV2 / encodePackCandidatesV2 — cross-language golden vectors", () => {
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
          ? encodePackCandidatesV2(input as PackRankInput)
          : encodeShopCandidatesV2(input as ShopRankInput);
      expect(encoded.length).toBe(expected.length * SHOP_INPUT_FEATURES_V2);
      for (let i = 0; i < expected.length; i++) {
        for (let j = 0; j < SHOP_INPUT_FEATURES_V2; j++) {
          expect(encoded[i * SHOP_INPUT_FEATURES_V2 + j]).toBeCloseTo(
            expected[i][j],
            5,
          );
        }
      }
    }
  });

  test("fixture covers purchase, reroll, pack-pick, and use cases", () => {
    const kinds = new Set(goldenCases().map((c) => c.record.kind));
    expect(kinds).toEqual(new Set(["purchase", "reroll", "pack-pick", "use"]));
  });

  test("flags the isUse candidate in the trailing feature", () => {
    const useCase = goldenCases().find((c) => c.record.kind === "use");
    const flags = useCase?.candidates.map(
      (row) => row[SHOP_INPUT_FEATURES_V2 - 1],
    );
    expect(flags).toEqual([1, 0]);
  });
});
