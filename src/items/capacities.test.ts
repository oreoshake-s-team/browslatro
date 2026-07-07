// @vitest-environment node
import { describe, expect, test } from "vitest";
import { HAND_SIZE } from "../cards/deck";
import {
  consumableCapacityFor,
  handSizeFor,
  jokerCapacityFor,
} from "./capacities";
import { MAX_CONSUMABLE_SLOTS } from "./consumables";
import { createTroubadourJoker, MAX_JOKERS } from "./jokers";
import type { VoucherId } from "./vouchers";

const NO_VOUCHERS: ReadonlySet<VoucherId> = new Set();

describe("jokerCapacityFor", () => {
  test("defaults to MAX_JOKERS with no vouchers on the Red Deck", () => {
    expect(jokerCapacityFor(NO_VOUCHERS, "red-deck")).toBe(MAX_JOKERS);
  });

  test("Antimatter adds a joker slot", () => {
    expect(jokerCapacityFor(new Set<VoucherId>(["antimatter"]), "red-deck")).toBe(
      MAX_JOKERS + 1,
    );
  });

  test("the Black Deck adds a joker slot", () => {
    expect(jokerCapacityFor(NO_VOUCHERS, "black-deck")).toBe(MAX_JOKERS + 1);
  });

  test("voucher and deck slots stack", () => {
    expect(
      jokerCapacityFor(new Set<VoucherId>(["antimatter"]), "black-deck"),
    ).toBe(MAX_JOKERS + 2);
  });
});

describe("consumableCapacityFor", () => {
  test("defaults to MAX_CONSUMABLE_SLOTS with no vouchers", () => {
    expect(consumableCapacityFor(NO_VOUCHERS)).toBe(MAX_CONSUMABLE_SLOTS);
  });

  test("Crystal Ball adds a consumable slot", () => {
    expect(consumableCapacityFor(new Set<VoucherId>(["crystal-ball"]))).toBe(
      MAX_CONSUMABLE_SLOTS + 1,
    );
  });
});

describe("handSizeFor", () => {
  test("defaults to HAND_SIZE with no modifiers", () => {
    expect(
      handSizeFor({
        handSizeModifier: 0,
        ownedVoucherIds: NO_VOUCHERS,
        jokers: [],
      }),
    ).toBe(HAND_SIZE);
  });

  test("applies the boss hand-size modifier", () => {
    expect(
      handSizeFor({
        handSizeModifier: -1,
        ownedVoucherIds: NO_VOUCHERS,
        jokers: [],
      }),
    ).toBe(HAND_SIZE - 1);
  });

  test("Paint Brush adds a card", () => {
    expect(
      handSizeFor({
        handSizeModifier: 0,
        ownedVoucherIds: new Set<VoucherId>(["paint-brush"]),
        jokers: [],
      }),
    ).toBe(HAND_SIZE + 1);
  });

  test("hand-size jokers add cards", () => {
    expect(
      handSizeFor({
        handSizeModifier: 0,
        ownedVoucherIds: NO_VOUCHERS,
        jokers: [createTroubadourJoker()],
      }),
    ).toBe(HAND_SIZE + 2);
  });

  test("never drops below one card (negative)", () => {
    expect(
      handSizeFor({
        handSizeModifier: -99,
        ownedVoucherIds: NO_VOUCHERS,
        jokers: [],
      }),
    ).toBe(1);
  });
});
