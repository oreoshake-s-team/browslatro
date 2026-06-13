// @vitest-environment node
import { describe, expect, test } from "vitest";
import {
  clearJokerDisable,
  disableJokerAt,
  pickDisabledJokerIndex,
} from "./crimsonHeart";
import { isJokerActive } from "./stickers";
import {
  createBusinessCardJoker,
  createJokerStencilJoker,
  createPlusFourMultJoker,
} from "./factories";
import type { Joker } from "./types";

function three(): Joker[] {
  return [
    createPlusFourMultJoker(),
    createBusinessCardJoker(),
    createJokerStencilJoker(),
  ];
}

describe("disableJokerAt", () => {
  test("disables exactly the joker at the given index", () => {
    const out = disableJokerAt(three(), 1);
    expect(out.map((j) => Boolean(j.disabled))).toEqual([false, true, false]);
  });

  test("clears a previously disabled joker when the target moves", () => {
    const out = disableJokerAt(disableJokerAt(three(), 0), 2);
    expect(out.map((j) => Boolean(j.disabled))).toEqual([false, false, true]);
  });

  test("keeps the same reference for an unchanged joker", () => {
    const jokers = three();
    const out = disableJokerAt(jokers, 1);
    expect(out[0]).toBe(jokers[0]);
  });
});

describe("clearJokerDisable", () => {
  test("clears the disabled flag on every joker", () => {
    const out = clearJokerDisable(disableJokerAt(three(), 1));
    expect(out.some((j) => j.disabled)).toBe(false);
  });
});

describe("pickDisabledJokerIndex", () => {
  test("returns an index inside the joker range", () => {
    expect(pickDisabledJokerIndex(three(), () => 0.99)).toBe(2);
  });

  test("returns -1 when there are no jokers", () => {
    expect(pickDisabledJokerIndex([], () => 0)).toBe(-1);
  });
});

describe("isJokerActive with a disabled joker", () => {
  test("a disabled joker is inactive", () => {
    expect(isJokerActive(disableJokerAt(three(), 0)[0])).toBe(false);
  });

  test("a non-disabled joker stays active (negative)", () => {
    expect(isJokerActive(disableJokerAt(three(), 0)[1])).toBe(true);
  });
});
