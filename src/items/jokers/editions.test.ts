// @vitest-environment node
import {
  FOIL_CHIPS,
  HOLOGRAPHIC_MULT,
  JOKER_EDITION_INFO,
  JOKER_EDITION_KINDS,
  MAX_JOKERS,
  POLYCHROME_X_MULT,
  applyHandLevelJokers,
  createJokerStencilJoker,
  createPlusFourMultJoker,
  effectiveJokerCount,
  withEdition,
} from "../jokers";

describe("JOKER_EDITION_KINDS", () => {
  test("includes the four Balatro joker editions", () => {
    expect(JOKER_EDITION_KINDS).toEqual([
      "foil",
      "holographic",
      "polychrome",
      "negative",
    ]);
  });
});

describe("JOKER_EDITION_INFO", () => {
  test("Foil name", () => {
    expect(JOKER_EDITION_INFO.foil.name).toBe("Foil");
  });

  test("Holographic name", () => {
    expect(JOKER_EDITION_INFO.holographic.name).toBe("Holographic");
  });

  test("Polychrome name", () => {
    expect(JOKER_EDITION_INFO.polychrome.name).toBe("Polychrome");
  });

  test("Negative name", () => {
    expect(JOKER_EDITION_INFO.negative.name).toBe("Negative");
  });
});

describe("withEdition", () => {
  test("returns a new joker with the edition set", () => {
    const j = withEdition(createPlusFourMultJoker(), "foil");
    expect(j.edition).toBe("foil");
  });

  test("preserves the original effect", () => {
    const j = withEdition(createPlusFourMultJoker(), "holographic");
    expect(j.effect).toEqual({ kind: "additive-mult", amount: 4 });
  });

  test("does not mutate the original joker", () => {
    const base = createPlusFourMultJoker();
    withEdition(base, "polychrome");
    expect(base.edition).toBeUndefined();
  });
});

describe("effectiveJokerCount", () => {
  test("counts every joker when none are Negative", () => {
    const jokers = [createPlusFourMultJoker(), createPlusFourMultJoker()];
    expect(effectiveJokerCount(jokers)).toBe(2);
  });

  test("ignores a Negative joker", () => {
    const jokers = [
      createPlusFourMultJoker(),
      withEdition(createPlusFourMultJoker(), "negative"),
    ];
    expect(effectiveJokerCount(jokers)).toBe(1);
  });

  test("returns 0 when every joker is Negative", () => {
    const jokers = [
      withEdition(createPlusFourMultJoker(), "negative"),
      withEdition(createPlusFourMultJoker(), "negative"),
    ];
    expect(effectiveJokerCount(jokers)).toBe(0);
  });

  test("treats non-negative editions as still counting", () => {
    const jokers = [
      withEdition(createPlusFourMultJoker(), "foil"),
      withEdition(createPlusFourMultJoker(), "holographic"),
      withEdition(createPlusFourMultJoker(), "polychrome"),
    ];
    expect(effectiveJokerCount(jokers)).toBe(3);
  });
});

describe("applyHandLevelJokers — Foil edition", () => {
  test(`adds +${FOIL_CHIPS} chips`, () => {
    const j = withEdition(createPlusFourMultJoker(), "foil");
    const result = applyHandLevelJokers([j]);
    expect(result.additiveChips).toBe(FOIL_CHIPS);
  });

  test("emits an additive-chips step in the joker's slot", () => {
    const j = withEdition(createPlusFourMultJoker(), "foil");
    const result = applyHandLevelJokers([j]);
    const editionStep = result.steps.find(
      (s) => s.jokerId === j.id && s.additiveChips === FOIL_CHIPS,
    );
    expect(editionStep).toBeDefined();
  });

  test("reports the joker as fired even when its base effect did not fire", () => {
    const j = withEdition(
      { ...createPlusFourMultJoker(), effect: { kind: "stencil" } as const, id: "stencil-foil" },
      "foil",
    );
    const result = applyHandLevelJokers([j]);
    expect(result.firedJokerIds).toContain("stencil-foil");
  });
});

describe("applyHandLevelJokers — Holographic edition", () => {
  test(`adds +${HOLOGRAPHIC_MULT} mult`, () => {
    const j = withEdition(createPlusFourMultJoker(), "holographic");
    const result = applyHandLevelJokers([j]);
    expect(result.additiveMult).toBe(4 + HOLOGRAPHIC_MULT);
  });

  test("emits an additive-mult step for the edition contribution", () => {
    const j = withEdition(createPlusFourMultJoker(), "holographic");
    const result = applyHandLevelJokers([j]);
    const editionStep = result.steps.find(
      (s) => s.jokerId === j.id && s.additiveMult === HOLOGRAPHIC_MULT,
    );
    expect(editionStep).toBeDefined();
  });
});

describe("applyHandLevelJokers — Polychrome edition", () => {
  test(`multiplies xMult by ${POLYCHROME_X_MULT}`, () => {
    const j = withEdition(createPlusFourMultJoker(), "polychrome");
    const result = applyHandLevelJokers([j]);
    expect(result.xMult).toBe(POLYCHROME_X_MULT);
  });

  test("emits an xMultFactor step for the polychrome contribution", () => {
    const j = withEdition(createPlusFourMultJoker(), "polychrome");
    const result = applyHandLevelJokers([j]);
    const editionStep = result.steps.find(
      (s) => s.jokerId === j.id && s.xMultFactor === POLYCHROME_X_MULT,
    );
    expect(editionStep).toBeDefined();
  });
});

describe("applyHandLevelJokers — Negative edition", () => {
  test("does not contribute additive chips", () => {
    const j = withEdition(createPlusFourMultJoker(), "negative");
    const result = applyHandLevelJokers([j]);
    expect(result.additiveChips).toBe(0);
  });

  test("does not multiply xMult", () => {
    const j = withEdition(createPlusFourMultJoker(), "negative");
    const result = applyHandLevelJokers([j]);
    expect(result.xMult).toBe(1);
  });

  test("does not emit an extra step beyond the base effect", () => {
    const j = withEdition(createPlusFourMultJoker(), "negative");
    const result = applyHandLevelJokers([j]);
    expect(result.steps.filter((s) => s.jokerId === j.id)).toHaveLength(1);
  });
});

describe("Joker Stencil with Negative editions", () => {
  test(`is x${MAX_JOKERS - 1} with one Negative + Stencil (Stencil sees only itself, Negative does not occupy)`, () => {
    const stencil = createJokerStencilJoker();
    const negativeJoker = withEdition(createPlusFourMultJoker(), "negative");
    const result = applyHandLevelJokers([stencil, negativeJoker]);
    expect(result.xMult).toBe(MAX_JOKERS - 1);
  });

  test("still fires Stencil when only Negative jokers fill the row past the cap", () => {
    const stencil = createJokerStencilJoker();
    const six: ReturnType<typeof withEdition>[] = [];
    for (let i = 0; i < 5; i += 1) {
      six.push(withEdition({ ...createPlusFourMultJoker(), id: `n-${i}` }, "negative"));
    }
    const result = applyHandLevelJokers([stencil, ...six]);
    expect(result.xMult).toBe(MAX_JOKERS - 1);
  });
});

describe("applyHandLevelJokers — no edition (negative test)", () => {
  test("an un-editioned joker emits exactly one step for its base effect", () => {
    const result = applyHandLevelJokers([createPlusFourMultJoker()]);
    expect(result.steps).toHaveLength(1);
  });

  test("an un-editioned joker contributes no additive chips", () => {
    const result = applyHandLevelJokers([createPlusFourMultJoker()]);
    expect(result.additiveChips).toBe(0);
  });

  test("an un-editioned joker contributes xMult of 1", () => {
    const result = applyHandLevelJokers([createPlusFourMultJoker()]);
    expect(result.xMult).toBe(1);
  });
});
