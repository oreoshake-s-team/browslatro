// @vitest-environment node
import { describe, expect, test } from "vitest";
import { createPlusFourMultJoker } from "../../items/jokers/factories";
import type { PackOffer, PackOption } from "../../items/packs";
import { createPlanetCatalog } from "../../items/planets";
import { createSpectralCatalog } from "../../items/spectrals";
import { createTarotCatalog } from "../../items/tarots";
import {
  buildPackAdvicePlan,
  type PackAdviceInput,
} from "./packAdvicePlan";
import { MAX_CANDIDATES, parseAdviceRequest } from "./types";

function planetOption(): PackOption {
  return { kind: "planet", planet: createPlanetCatalog()[0] };
}

function jokerOption(): PackOption {
  return { kind: "joker", joker: createPlusFourMultJoker() };
}

function targetedSpectralOption(): PackOption {
  const spectral = createSpectralCatalog().find(
    (card) => card.effect.kind === "apply-seal",
  );
  if (!spectral) throw new Error("expected an apply-seal spectral");
  return { kind: "spectral", spectral };
}

function packFixture(options: ReadonlyArray<PackOption>): PackOffer {
  return { pool: "celestial", variant: "normal", options };
}

function enhancementTarotOption(): PackOption {
  const tarot = createTarotCatalog().find(
    (card) => card.effect.kind === "apply-enhancement",
  );
  if (!tarot) throw new Error("expected an apply-enhancement tarot");
  return { kind: "tarot", tarot };
}

function inputFixture(overrides: Partial<PackAdviceInput> = {}): PackAdviceInput {
  return {
    pack: packFixture([planetOption(), jokerOption()]),
    picksRemaining: 1,
    pickedIndices: new Set(),
    jokerSlotsFull: false,
    consumableSlotsFull: false,
    previewHandSize: 0,
    previewSelectedCount: 0,
    money: 10,
    ante: 2,
    jokers: [],
    consumables: [],
    jokerCapacity: 5,
    consumableCapacity: 2,
    ...overrides,
  };
}

describe("buildPackAdvicePlan", () => {
  test("includes each unpicked option as a pick candidate", () => {
    const plan = buildPackAdvicePlan(inputFixture());
    expect(plan?.actions).toEqual([
      { kind: "pick", optionIdx: 0 },
      { kind: "pick", optionIdx: 1 },
      { kind: "skip" },
    ]);
  });

  test("excludes already-picked option indices", () => {
    const plan = buildPackAdvicePlan(
      inputFixture({ pickedIndices: new Set([0]) }),
    );
    expect(plan?.actions).toEqual([
      { kind: "pick", optionIdx: 1 },
      { kind: "skip" },
    ]);
  });

  test("excludes joker options when joker slots are full", () => {
    const plan = buildPackAdvicePlan(inputFixture({ jokerSlotsFull: true }));
    expect(plan?.actions.some((action) => action.kind === "pick" && action.optionIdx === 1)).toBe(false);
  });

  test("excludes targeted spectral options when consumable slots are full", () => {
    const plan = buildPackAdvicePlan(
      inputFixture({
        pack: packFixture([targetedSpectralOption(), planetOption()]),
        consumableSlotsFull: true,
      }),
    );
    expect(plan?.actions.some((action) => action.kind === "pick" && action.optionIdx === 0)).toBe(false);
  });

  test("excludes a selection-requiring tarot while the preview hand has no selection", () => {
    const plan = buildPackAdvicePlan(
      inputFixture({
        pack: packFixture([enhancementTarotOption(), planetOption()]),
        previewHandSize: 8,
        previewSelectedCount: 0,
      }),
    );
    expect(plan?.actions).toEqual([
      { kind: "pick", optionIdx: 1 },
      { kind: "skip" },
    ]);
  });

  test("includes a selection-requiring tarot once a valid selection exists", () => {
    const plan = buildPackAdvicePlan(
      inputFixture({
        pack: packFixture([enhancementTarotOption(), planetOption()]),
        previewHandSize: 8,
        previewSelectedCount: 1,
      }),
    );
    expect(plan?.actions).toEqual([
      { kind: "pick", optionIdx: 0 },
      { kind: "pick", optionIdx: 1 },
      { kind: "skip" },
    ]);
  });

  test("excludes a tray-bound enhancement tarot when consumable slots are full", () => {
    const plan = buildPackAdvicePlan(
      inputFixture({
        pack: packFixture([enhancementTarotOption(), planetOption()]),
        previewHandSize: 0,
        consumableSlotsFull: true,
      }),
    );
    expect(plan?.actions).toEqual([
      { kind: "pick", optionIdx: 1 },
      { kind: "skip" },
    ]);
  });

  test("returns null when no picks remain", () => {
    expect(buildPackAdvicePlan(inputFixture({ picksRemaining: 0 }))).toBeNull();
  });

  test("returns null when skipping is the only legal action", () => {
    const plan = buildPackAdvicePlan(
      inputFixture({
        pack: packFixture([jokerOption()]),
        jokerSlotsFull: true,
      }),
    );
    expect(plan).toBeNull();
  });

  test("always puts skip last", () => {
    const plan = buildPackAdvicePlan(inputFixture());
    expect(plan?.request.candidates.at(-1)).toEqual({ action: "skip" });
  });

  test("caps the candidate list at the contract maximum", () => {
    const options = Array.from({ length: MAX_CANDIDATES + 3 }, () =>
      planetOption(),
    );
    const plan = buildPackAdvicePlan(inputFixture({ pack: packFixture(options) }));
    expect(plan?.request.candidates).toHaveLength(MAX_CANDIDATES);
  });

  test("carries picksRemaining in the request state", () => {
    const plan = buildPackAdvicePlan(inputFixture({ picksRemaining: 2 }));
    expect(plan?.request.pack.picksRemaining).toBe(2);
  });

  test("produces a request the server-side parser accepts", () => {
    const plan = buildPackAdvicePlan(
      inputFixture({
        jokers: [createPlusFourMultJoker()],
        consumables: [{ kind: "planet", card: createPlanetCatalog()[0] }],
      }),
    );
    expect(plan && parseAdviceRequest(plan.request)).not.toBeNull();
  });
});
