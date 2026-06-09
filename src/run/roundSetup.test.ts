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

describe("computeStartingDiscards — Blue Stake -1 discard (#556)", () => {
  test("White Stake leaves base starting discards unchanged (regression)", () => {
    expect(
      computeStartingDiscards({
        blind: 1,
        boss: null,
        ownedVoucherIds: NO_VOUCHERS,
        deck: "yellow-deck",
        jokers: [],
        stake: "white",
      }),
    ).toBe(3);
  });

  test("Blue Stake subtracts 1 from starting discards", () => {
    expect(
      computeStartingDiscards({
        blind: 1,
        boss: null,
        ownedVoucherIds: NO_VOUCHERS,
        deck: "yellow-deck",
        jokers: [],
        stake: "blue",
      }),
    ).toBe(2);
  });

  test("Blue Stake stacks with Red Deck's +1 delta (net 3)", () => {
    expect(
      computeStartingDiscards({
        blind: 1,
        boss: null,
        ownedVoucherIds: NO_VOUCHERS,
        deck: "red-deck",
        jokers: [],
        stake: "blue",
      }),
    ).toBe(3);
  });

  test("Blue Stake floors discards at 0 when Burglar override is active", () => {
    expect(
      computeStartingDiscards({
        blind: 1,
        boss: null,
        ownedVoucherIds: NO_VOUCHERS,
        deck: "red-deck",
        jokers: [createBurglarJoker()],
        stake: "blue",
      }),
    ).toBe(0);
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

describe("computeStartingHands — Black Deck -1 hand (#566)", () => {
  test("Black Deck subtracts 1 from base starting hands", () => {
    const baseline = computeStartingHands({
      blind: 1,
      boss: null,
      ownedVoucherIds: NO_VOUCHERS,
      deck: "red-deck",
      jokers: [],
    });
    const withBlack = computeStartingHands({
      blind: 1,
      boss: null,
      ownedVoucherIds: NO_VOUCHERS,
      deck: "black-deck",
      jokers: [],
    });
    expect(baseline - withBlack).toBe(1);
  });
});
