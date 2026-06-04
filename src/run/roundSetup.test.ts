// @vitest-environment node
import { describe, expect, test } from "vitest";
import { computeStartingDiscards, computeStartingHands } from "./roundSetup";
import {
  createBurglarJoker,
  createDrunkardJoker,
} from "../items/jokers";
import type { VoucherId } from "../items/vouchers";

const NO_VOUCHERS: ReadonlySet<VoucherId> = new Set();

describe("computeStartingDiscards — Burglar override (#709)", () => {
  test("returns the default when no jokers are equipped (regression)", () => {
    expect(
      computeStartingDiscards({
        blind: 1,
        boss: null,
        ownedVoucherIds: NO_VOUCHERS,
        deck: "red-deck",
        jokers: [],
      }),
    ).toBeGreaterThan(0);
  });

  test("Burglar overrides starting discards to 0", () => {
    expect(
      computeStartingDiscards({
        blind: 1,
        boss: null,
        ownedVoucherIds: NO_VOUCHERS,
        deck: "red-deck",
        jokers: [createBurglarJoker()],
      }),
    ).toBe(0);
  });

  test("Burglar's override beats Drunkard's +1 additive", () => {
    expect(
      computeStartingDiscards({
        blind: 1,
        boss: null,
        ownedVoucherIds: NO_VOUCHERS,
        deck: "red-deck",
        jokers: [createBurglarJoker(), createDrunkardJoker()],
      }),
    ).toBe(0);
  });

  test("Drunkard alone still adds +1 (regression)", () => {
    const baseline = computeStartingDiscards({
      blind: 1,
      boss: null,
      ownedVoucherIds: NO_VOUCHERS,
      deck: "red-deck",
      jokers: [],
    });
    const withDrunkard = computeStartingDiscards({
      blind: 1,
      boss: null,
      ownedVoucherIds: NO_VOUCHERS,
      deck: "red-deck",
      jokers: [createDrunkardJoker()],
    });
    expect(withDrunkard - baseline).toBe(1);
  });
});

describe("computeStartingHands — Burglar +3 hands (#709)", () => {
  test("Burglar adds 3 hands on top of the default", () => {
    const baseline = computeStartingHands({
      blind: 1,
      boss: null,
      ownedVoucherIds: NO_VOUCHERS,
      deck: "red-deck",
      jokers: [],
    });
    const withBurglar = computeStartingHands({
      blind: 1,
      boss: null,
      ownedVoucherIds: NO_VOUCHERS,
      deck: "red-deck",
      jokers: [createBurglarJoker()],
    });
    expect(withBurglar - baseline).toBe(3);
  });
});
