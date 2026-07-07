// @vitest-environment node
import { describe, expect, test } from "vitest";
import { joker } from "../../ai/test-helpers";
import { canAddJokerToRow } from "./collection";
import { MAX_JOKERS } from "./constants";

const fullRow = Array.from({ length: MAX_JOKERS }, (_, i) =>
  joker({ id: `j${i}` }),
);

describe("canAddJokerToRow", () => {
  test("allows a joker while the row is below capacity", () => {
    expect(canAddJokerToRow([joker()], joker({ id: "new" }), MAX_JOKERS)).toBe(
      true,
    );
  });

  test("refuses a plain joker at capacity", () => {
    expect(canAddJokerToRow(fullRow, joker({ id: "new" }), MAX_JOKERS)).toBe(
      false,
    );
  });

  test("allows a Negative joker at capacity", () => {
    expect(
      canAddJokerToRow(
        fullRow,
        joker({ id: "new", edition: "negative" }),
        MAX_JOKERS,
      ),
    ).toBe(true);
  });

  test("held Negative jokers do not count toward the cap", () => {
    const withNegative = [
      ...fullRow.slice(0, MAX_JOKERS - 1),
      joker({ id: "held-neg", edition: "negative" }),
    ];
    expect(canAddJokerToRow(withNegative, joker({ id: "new" }), MAX_JOKERS)).toBe(
      true,
    );
  });
});
