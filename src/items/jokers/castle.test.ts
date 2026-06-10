// @vitest-environment node
import {
  CASTLE_CHIPS_PER_DISCARD,
  applyDiscardToJokerStates,
  applyHandLevelJokers,
  createCastleJoker,
  createJokerCatalog,
} from "../jokers";
import type { Card, Rank, Suit } from "../../cards/types";

let nextId = 0;
function card(rank: Rank, suit: Suit): Card {
  return { id: ++nextId, rank, suit };
}

beforeEach(() => {
  nextId = 0;
});

describe("Castle (#1007)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("castle");
  });

  test("discarding a card of the chosen suit grows the counter", () => {
    const [updated] = applyDiscardToJokerStates(
      [createCastleJoker()],
      [card("5", "hearts")],
      "hearts",
    );
    expect(updated.state).toEqual({
      kind: "counter",
      value: CASTLE_CHIPS_PER_DISCARD,
    });
  });

  test("two matching discards in one action stack", () => {
    const [updated] = applyDiscardToJokerStates(
      [createCastleJoker()],
      [card("5", "hearts"), card("9", "hearts")],
      "hearts",
    );
    expect(updated.state).toEqual({
      kind: "counter",
      value: 2 * CASTLE_CHIPS_PER_DISCARD,
    });
  });

  test("off-suit discards do not grow the counter (negative)", () => {
    const [updated] = applyDiscardToJokerStates(
      [createCastleJoker()],
      [card("5", "clubs")],
      "hearts",
    );
    expect(updated.state).toEqual({ kind: "counter", value: 0 });
  });

  test("no chosen suit means no growth (negative)", () => {
    const [updated] = applyDiscardToJokerStates(
      [createCastleJoker()],
      [card("5", "hearts")],
      null,
    );
    expect(updated.state).toEqual({ kind: "counter", value: 0 });
  });

  test("scoring adds the accumulated counter as chips", () => {
    const jokers = applyDiscardToJokerStates(
      [createCastleJoker()],
      [card("5", "hearts")],
      "hearts",
    );
    const result = applyHandLevelJokers(jokers, { playedHandLabel: "Pair" });
    expect(result.additiveChips).toBe(CASTLE_CHIPS_PER_DISCARD);
  });
});
