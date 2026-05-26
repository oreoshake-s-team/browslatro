import {
  GOLD_SEAL_BONUS,
  SEAL_KINDS,
  blueSealHeldCards,
  expandRedSealRetriggers,
  getSealInfo,
  goldSealMoney,
  pickRandomTarot,
  planetForHand,
  purpleSealDiscarded,
} from "./seals";
import type { Card } from "./types";
import { createTarotCatalog } from "../items/tarots";

const plain: Card = { id: 1, rank: "2", suit: "spades" };
const gold: Card = { id: 2, rank: "3", suit: "hearts", seal: "gold" };
const red: Card = { id: 3, rank: "4", suit: "diamonds", seal: "red" };
const blue: Card = { id: 4, rank: "5", suit: "clubs", seal: "blue" };
const purple: Card = { id: 5, rank: "6", suit: "spades", seal: "purple" };

describe("seals — constants", () => {
  test("GOLD_SEAL_BONUS is 3", () => {
    expect(GOLD_SEAL_BONUS).toBe(3);
  });

  test("SEAL_KINDS contains all four seals", () => {
    expect(SEAL_KINDS).toEqual(["gold", "red", "blue", "purple"]);
  });
});

describe("seals — getSealInfo", () => {
  test("returns the Gold Seal name", () => {
    expect(getSealInfo("gold").name).toBe("Gold Seal");
  });

  test("returns the Red Seal name", () => {
    expect(getSealInfo("red").name).toBe("Red Seal");
  });

  test("returns the Blue Seal name", () => {
    expect(getSealInfo("blue").name).toBe("Blue Seal");
  });

  test("returns the Purple Seal name", () => {
    expect(getSealInfo("purple").name).toBe("Purple Seal");
  });
});

describe("seals — goldSealMoney", () => {
  test("returns the bonus amount for a Gold-seal card", () => {
    expect(goldSealMoney(gold)).toBe(GOLD_SEAL_BONUS);
  });

  test("returns 0 for a card without a Gold Seal", () => {
    expect(goldSealMoney(plain)).toBe(0);
  });

  test("returns 0 for a non-gold seal", () => {
    expect(goldSealMoney(red)).toBe(0);
  });
});

describe("seals — expandRedSealRetriggers", () => {
  test("duplicates a Red-seal card", () => {
    expect(expandRedSealRetriggers([red]).length).toBe(2);
  });

  test("does not duplicate a plain card", () => {
    expect(expandRedSealRetriggers([plain]).length).toBe(1);
  });

  test("places the retrigger immediately after the original", () => {
    const out = expandRedSealRetriggers([plain, red, plain]);
    expect(out.map((c) => c.id)).toEqual([1, 3, 3, 1]);
  });

  test("does not retrigger a Gold-seal card", () => {
    expect(expandRedSealRetriggers([gold]).length).toBe(1);
  });
});

describe("seals — blueSealHeldCards", () => {
  test("returns blue-seal cards still in hand", () => {
    expect(blueSealHeldCards([plain, blue], new Set()).map((c) => c.id)).toEqual([4]);
  });

  test("excludes blue-seal cards that were just submitted", () => {
    expect(blueSealHeldCards([plain, blue], new Set([4]))).toEqual([]);
  });

  test("returns empty when no blue seals are held", () => {
    expect(blueSealHeldCards([plain, gold], new Set())).toEqual([]);
  });
});

describe("seals — purpleSealDiscarded", () => {
  test("returns purple-seal cards being discarded", () => {
    expect(
      purpleSealDiscarded([plain, purple], new Set([5])).map((c) => c.id),
    ).toEqual([5]);
  });

  test("ignores purple cards not in the discard set", () => {
    expect(purpleSealDiscarded([plain, purple], new Set([1]))).toEqual([]);
  });

  test("returns empty when no purple seals exist", () => {
    expect(purpleSealDiscarded([plain, gold], new Set([1, 2]))).toEqual([]);
  });
});

describe("seals — planetForHand", () => {
  test("maps High Card to Pluto", () => {
    expect(planetForHand("High Card")?.id).toBe("pluto");
  });

  test("maps Flush to Jupiter", () => {
    expect(planetForHand("Flush")?.id).toBe("jupiter");
  });

  test("maps Straight Flush to Neptune", () => {
    expect(planetForHand("Straight Flush")?.id).toBe("neptune");
  });

  test("maps Royal Flush to Neptune", () => {
    expect(planetForHand("Royal Flush")?.id).toBe("neptune");
  });
});

describe("seals — pickRandomTarot", () => {
  test("picks a tarot from the catalog using the provided rng", () => {
    const tarot = pickRandomTarot(() => 0);
    expect(tarot.id).toBe(createTarotCatalog()[0].id);
  });

  test("uses the rng output to index into the catalog", () => {
    const catalog = createTarotCatalog();
    const lastIndex = catalog.length - 1;
    const tarot = pickRandomTarot(() => lastIndex / catalog.length);
    expect(tarot.id).toBe(catalog[lastIndex].id);
  });
});
