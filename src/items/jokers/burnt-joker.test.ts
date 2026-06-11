// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { createBurntJoker, createJokerCatalog } from "../jokers";
import { useDiscardPipeline } from "../../hooks/useDiscardPipeline";
import { useGame } from "../../store/game";
import type { Card } from "../../cards/types";

const pairOfNines: Card[] = [
  { id: 1, rank: "9", suit: "clubs" },
  { id: 2, rank: "9", suit: "hearts" },
];

function discardCards(cards: ReadonlyArray<Card>): void {
  useGame.getState().setDealt({ hand: [...cards], remaining: [] });
  useGame.getState().setSelectedIds(new Set(cards.map((c) => c.id)));
  const { result } = renderHook(() => useDiscardPipeline());
  act(() => result.current.discardSelected());
}

beforeEach(() => {
  useGame.getState().resetGame();
  useGame.getState().setRemainingDiscards(3);
});

describe("Burnt Joker (#1029)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("burnt-joker");
  });

  test("the first discard of the round upgrades the discarded hand", () => {
    useGame.getState().setJokers([createBurntJoker()]);
    const before = useGame.getState().handStats.Pair.level;
    discardCards(pairOfNines);
    expect(useGame.getState().handStats.Pair.level).toBe(before + 1);
  });

  test("records a hand-upgraded scoring log entry sourced to Burnt Joker", () => {
    useGame.getState().setJokers([createBurntJoker()]);
    discardCards(pairOfNines);
    const entry = useGame
      .getState()
      .scoringEvents.find((e) => e.kind === "hand-upgraded");
    expect(entry).toEqual({
      kind: "hand-upgraded",
      handLabel: "Pair",
      level: useGame.getState().handStats.Pair.level,
      source: "Burnt Joker",
    });
  });

  test("does not record a hand-upgraded entry without Burnt Joker (negative)", () => {
    useGame.getState().setJokers([]);
    discardCards(pairOfNines);
    const entry = useGame
      .getState()
      .scoringEvents.find((e) => e.kind === "hand-upgraded");
    expect(entry).toBeUndefined();
  });

  test("a second discard does not upgrade (negative)", () => {
    useGame.getState().setJokers([createBurntJoker()]);
    useGame.getState().setDiscardsUsedThisRound(1);
    const before = useGame.getState().handStats.Pair.level;
    discardCards(pairOfNines);
    expect(useGame.getState().handStats.Pair.level).toBe(before);
  });

  test("without Burnt Joker nothing upgrades (negative)", () => {
    useGame.getState().setJokers([]);
    const before = useGame.getState().handStats.Pair.level;
    discardCards(pairOfNines);
    expect(useGame.getState().handStats.Pair.level).toBe(before);
  });
});
