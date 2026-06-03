// @vitest-environment node
import {
  JOKER_RARITIES,
  YORICK_MULT,
  cloneJoker,
  copyRandomJokerDestroyOthers,
  createBaronJoker,
  createBusinessCardJoker,
  createJokerByRarity,
  createJokerCatalog,
  createJokerStencilJoker,
  createLegendaryJokerCatalog,
  createMisprintJoker,
  createPlusFourMultJoker,
  createYorickJoker,
  pickRandomEquipped,
  pickRandomFromCatalog,
  polychromeRandomJokerDestroyOthers,
  replaceJokersExceptCopyOf,
  withEdition,
  withoutEdition,
  type Joker,
  type JokerRarity,
  type RandomSource,
} from "../jokers";

function fixedRng(values: ReadonlyArray<number>): RandomSource {
  let i = 0;
  return (): number => {
    const v = values[i % values.length];
    i += 1;
    return v;
  };
}

describe("JOKER_RARITIES", () => {
  test("lists the four canonical Balatro rarity tiers", () => {
    expect(JOKER_RARITIES).toEqual([
      "common",
      "uncommon",
      "rare",
      "legendary",
    ]);
  });
});

describe("rarity tagging", () => {
  test.each<{ name: string; rarity: JokerRarity; factory: () => Joker }>([
    { name: "+4 Mult", rarity: "common", factory: createPlusFourMultJoker },
    { name: "Joker Stencil", rarity: "uncommon", factory: createJokerStencilJoker },
    { name: "Misprint", rarity: "uncommon", factory: createMisprintJoker },
    { name: "Yorick", rarity: "legendary", factory: createYorickJoker },
  ])("$name is $rarity", ({ rarity, factory }) => {
    expect(factory().rarity).toBe<JokerRarity>(rarity);
  });

  test("every catalog joker has a rarity", () => {
    const allTagged = createJokerCatalog().every((j) => j.rarity !== undefined);
    expect(allTagged).toBe(true);
  });

  test("the shop catalog does not include any legendary jokers", () => {
    const legendaryInCatalog = createJokerCatalog().some(
      (j) => j.rarity === "legendary",
    );
    expect(legendaryInCatalog).toBe(false);
  });
});

describe("createLegendaryJokerCatalog", () => {
  test("contains at least one legendary joker", () => {
    expect(createLegendaryJokerCatalog().length).toBeGreaterThanOrEqual(1);
  });

  test("every entry has legendary rarity", () => {
    const allLegendary = createLegendaryJokerCatalog().every(
      (j) => j.rarity === "legendary",
    );
    expect(allLegendary).toBe(true);
  });

  test("includes Yorick by id", () => {
    const ids = createLegendaryJokerCatalog().map((j) => j.id);
    expect(ids).toContain("yorick");
  });
});

describe("Yorick placeholder effect", () => {
  test("uses the documented mult constant", () => {
    const yorick = createYorickJoker();
    expect(yorick.effect).toEqual({ kind: "additive-mult", amount: YORICK_MULT });
  });
});

describe("cloneJoker", () => {
  test("returns an object equal to the source", () => {
    const j = createPlusFourMultJoker();
    expect(cloneJoker(j)).toEqual(j);
  });

  test("returns a distinct object (not the same reference)", () => {
    const j = createPlusFourMultJoker();
    expect(cloneJoker(j)).not.toBe(j);
  });

  test("preserves the edition on a cloned editioned joker", () => {
    const j = withEdition(createPlusFourMultJoker(), "polychrome");
    expect(cloneJoker(j).edition).toBe("polychrome");
  });
});

describe("withoutEdition", () => {
  test("strips the edition field", () => {
    const j = withEdition(createPlusFourMultJoker(), "negative");
    expect(withoutEdition(j).edition).toBeUndefined();
  });

  test("preserves the rest of the joker", () => {
    const j = withEdition(createPlusFourMultJoker(), "foil");
    const stripped = withoutEdition(j);
    expect(stripped.id).toBe(j.id);
  });
});

describe("pickRandomEquipped", () => {
  test("returns the only joker when one is equipped", () => {
    const jokers = [createPlusFourMultJoker()];
    expect(pickRandomEquipped(jokers, fixedRng([0]))?.id).toBe("plus-four-mult");
  });

  test("returns null when no jokers are equipped", () => {
    expect(pickRandomEquipped([], fixedRng([0]))).toBeNull();
  });

  test("respects the RNG to pick across positions", () => {
    const jokers = [
      createPlusFourMultJoker(),
      createBusinessCardJoker(),
      createJokerStencilJoker(),
    ];
    expect(pickRandomEquipped(jokers, fixedRng([0.99]))?.id).toBe(
      "joker-stencil",
    );
  });

  test("RNG roll of 0 picks the first equipped joker", () => {
    const jokers = [
      createPlusFourMultJoker(),
      createBusinessCardJoker(),
      createJokerStencilJoker(),
    ];
    expect(pickRandomEquipped(jokers, fixedRng([0]))?.id).toBe("plus-four-mult");
  });
});

describe("pickRandomFromCatalog", () => {
  test("returns a joker matching the filter", () => {
    const result = pickRandomFromCatalog(
      createJokerCatalog(),
      (j) => j.rarity === "uncommon",
      fixedRng([0]),
    );
    expect(result?.rarity).toBe<JokerRarity>("uncommon");
  });

  test("returns null when the filter matches nothing", () => {
    const result = pickRandomFromCatalog(
      createJokerCatalog(),
      (j) => j.rarity === "legendary",
      fixedRng([0]),
    );
    expect(result).toBeNull();
  });

  test("returns a legendary when filtering the legendary catalog", () => {
    const result = pickRandomFromCatalog(
      createLegendaryJokerCatalog(),
      (j) => j.rarity === "legendary",
      fixedRng([0]),
    );
    expect(result?.rarity).toBe<JokerRarity>("legendary");
  });

  test("returns null on an empty catalog", () => {
    expect(
      pickRandomFromCatalog([] as ReadonlyArray<Joker>, () => true, fixedRng([0])),
    ).toBeNull();
  });
});

function fakeRare(id: string): Joker {
  return {
    id,
    name: id,
    description: "",
    effect: { kind: "additive-mult", amount: 1 },
    rarity: "rare",
  };
}

describe("createJokerByRarity", () => {
  test("returns a joker of the requested rarity when there is room", () => {
    const result = createJokerByRarity([], createJokerCatalog(), "rare", 5, fixedRng([0]));
    expect(result?.rarity).toBe<JokerRarity>("rare");
  });

  test("excludes jokers already equipped", () => {
    const catalog = [fakeRare("a"), fakeRare("b")];
    const result = createJokerByRarity([fakeRare("a")], catalog, "rare", 5, fixedRng([0]));
    expect(result?.id).toBe("b");
  });

  test("returns null when at capacity", () => {
    const equipped = [createPlusFourMultJoker(), createBusinessCardJoker()];
    expect(createJokerByRarity(equipped, createJokerCatalog(), "rare", 2, fixedRng([0]))).toBeNull();
  });

  test("returns null when no unowned joker of the rarity exists", () => {
    const result = createJokerByRarity([createBaronJoker()], createJokerCatalog(), "rare", 5, fixedRng([0]));
    expect(result).toBeNull();
  });
});

describe("replaceJokersExceptCopyOf", () => {
  test("returns a single-element list containing a clone of the target joker", () => {
    const jokers = [
      createPlusFourMultJoker(),
      createBusinessCardJoker(),
      createJokerStencilJoker(),
    ];
    const result = replaceJokersExceptCopyOf(jokers, 1);
    expect(result.map((j) => j.id)).toEqual(["business-card"]);
  });

  test("the surviving joker is a clone, not the original reference", () => {
    const jokers = [createPlusFourMultJoker(), createBusinessCardJoker()];
    const result = replaceJokersExceptCopyOf(jokers, 0);
    expect(result[0]).not.toBe(jokers[0]);
  });

  test("preserves the edition on the clone (caller strips Negative if needed)", () => {
    const jokers = [withEdition(createPlusFourMultJoker(), "polychrome")];
    const result = replaceJokersExceptCopyOf(jokers, 0);
    expect(result[0].edition).toBe("polychrome");
  });

  test("returns a copy of the original list when idx is out of bounds", () => {
    const jokers = [createPlusFourMultJoker()];
    const result = replaceJokersExceptCopyOf(jokers, 5);
    expect(result.map((j) => j.id)).toEqual(["plus-four-mult"]);
  });

  test("returns a copy of the original list when idx is negative", () => {
    const jokers = [createPlusFourMultJoker(), createBusinessCardJoker()];
    const result = replaceJokersExceptCopyOf(jokers, -1);
    expect(result).toHaveLength(2);
  });

  test("returns an empty list when invoked on an empty equipped list", () => {
    expect(replaceJokersExceptCopyOf([], 0)).toEqual([]);
  });
});

describe("polychromeRandomJokerDestroyOthers", () => {
  test("returns a single joker", () => {
    const jokers = [
      createPlusFourMultJoker(),
      createBusinessCardJoker(),
      createJokerStencilJoker(),
    ];
    expect(polychromeRandomJokerDestroyOthers(jokers, fixedRng([0]))).toHaveLength(1);
  });

  test("keeps the joker selected by the rng", () => {
    const jokers = [
      createPlusFourMultJoker(),
      createBusinessCardJoker(),
      createJokerStencilJoker(),
    ];
    const result = polychromeRandomJokerDestroyOthers(jokers, fixedRng([0.5]));
    expect(result[0].id).toBe("business-card");
  });

  test("applies the Polychrome edition to the surviving joker", () => {
    const jokers = [createPlusFourMultJoker(), createBusinessCardJoker()];
    const result = polychromeRandomJokerDestroyOthers(jokers, fixedRng([0]));
    expect(result[0].edition).toBe("polychrome");
  });

  test("overrides any pre-existing edition on the surviving joker", () => {
    const jokers = [withEdition(createPlusFourMultJoker(), "foil")];
    const result = polychromeRandomJokerDestroyOthers(jokers, fixedRng([0]));
    expect(result[0].edition).toBe("polychrome");
  });

  test("returns an empty list when invoked on no jokers (negative)", () => {
    expect(polychromeRandomJokerDestroyOthers([], fixedRng([0]))).toEqual([]);
  });
});

describe("copyRandomJokerDestroyOthers", () => {
  test("returns exactly two jokers when starting from at least one", () => {
    const jokers = [
      createPlusFourMultJoker(),
      createBusinessCardJoker(),
      createJokerStencilJoker(),
    ];
    expect(copyRandomJokerDestroyOthers(jokers, fixedRng([0]))).toHaveLength(2);
  });

  test("the surviving pair are both copies of the rng-selected joker", () => {
    const jokers = [
      createPlusFourMultJoker(),
      createBusinessCardJoker(),
      createJokerStencilJoker(),
    ];
    const result = copyRandomJokerDestroyOthers(jokers, fixedRng([0.5]));
    expect(result.map((j) => j.id)).toEqual(["business-card", "business-card"]);
  });

  test("preserves the chosen joker's reference as the first entry", () => {
    const jokers = [createPlusFourMultJoker(), createBusinessCardJoker()];
    const result = copyRandomJokerDestroyOthers(jokers, fixedRng([0]));
    expect(result[0]).toBe(jokers[0]);
  });

  test("the appended copy is a fresh clone, not the same reference", () => {
    const jokers = [createPlusFourMultJoker()];
    const result = copyRandomJokerDestroyOthers(jokers, fixedRng([0]));
    expect(result[1]).not.toBe(result[0]);
  });

  test("preserves edition on the cloned copy", () => {
    const jokers = [withEdition(createPlusFourMultJoker(), "polychrome")];
    const result = copyRandomJokerDestroyOthers(jokers, fixedRng([0]));
    expect(result[1].edition).toBe("polychrome");
  });

  test("returns an empty list when invoked on no jokers (negative)", () => {
    expect(copyRandomJokerDestroyOthers([], fixedRng([0]))).toEqual([]);
  });
});
