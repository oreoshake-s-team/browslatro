// @vitest-environment node
import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "../../store/game";
import { toModelStateInput, toSimulatePlayInput } from "./snapshot";

beforeEach(() => {
  useGame.getState().resetGame();
});

describe("toSimulatePlayInput", () => {
  test("shares the store's dealt pile by reference", () => {
    const state = useGame.getState();
    expect(toSimulatePlayInput(state).dealt).toBe(state.dealt);
  });

  test("shares the store's base deck by reference", () => {
    const state = useGame.getState();
    expect(toSimulatePlayInput(state).baseDeckCards).toBe(state.baseDeckCards);
  });

  test("shares the store's jokers by reference", () => {
    const state = useGame.getState();
    expect(toSimulatePlayInput(state).jokers).toBe(state.jokers);
  });

  test("shares the store's card enhancements by reference", () => {
    const state = useGame.getState();
    expect(toSimulatePlayInput(state).cardEnhancementsById).toBe(
      state.cardEnhancementsById,
    );
  });

  test("carries the store's boss", () => {
    const state = useGame.getState();
    expect(toSimulatePlayInput(state).currentBoss).toBe(state.currentBoss);
  });

  test("carries the store's money", () => {
    const state = useGame.getState();
    expect(toSimulatePlayInput(state).money).toBe(state.money);
  });

  test("carries the store's remaining hands and discards", () => {
    const state = useGame.getState();
    const input = toSimulatePlayInput(state);
    expect([input.remainingHands, input.remainingDiscards]).toEqual([
      state.remainingHands,
      state.remainingDiscards,
    ]);
  });

  test("carries the store's joker-state targets", () => {
    const state = useGame.getState();
    const input = toSimulatePlayInput(state);
    expect([input.todoHand, input.idolTarget, input.ancientSuit]).toEqual([
      state.todoHand,
      state.idolTarget,
      state.ancientSuit,
    ]);
  });
});

describe("toModelStateInput", () => {
  test("shares the store's dealt pile by reference", () => {
    const state = useGame.getState();
    expect(toModelStateInput(state).dealt).toBe(state.dealt);
  });

  test("carries the store's ante", () => {
    const state = useGame.getState();
    expect(toModelStateInput(state).ante).toBe(state.ante);
  });

  test("carries the store's stake", () => {
    const state = useGame.getState();
    expect(toModelStateInput(state).selectedStake).toBe(state.selectedStake);
  });

  test("carries the store's round score", () => {
    const state = useGame.getState();
    expect(toModelStateInput(state).roundScore).toBe(state.roundScore);
  });

  test("reflects live store updates", () => {
    useGame.getState().setRound(7);
    expect(toModelStateInput(useGame.getState()).round).toBe(7);
  });
});
