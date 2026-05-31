import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { useDragController } from "./useDragController";
import { useGame } from "../store/game";
import { createPlanetCatalog } from "../items/planets";

function makeParams() {
  return {
    useConsumable: vi.fn(),
    sellConsumable: vi.fn(),
    sellJoker: vi.fn(),
  };
}

describe("useDragController", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("draggingConsumableIndex reflects store state", () => {
    useGame.getState().setDraggingConsumableIndex(2);
    const { result } = renderHook(() => useDragController(makeParams()));
    expect(result.current.draggingConsumableIndex).toBe(2);
  });

  test("draggingJokerIndex reflects store state", () => {
    useGame.getState().setDraggingJokerIndex(1);
    const { result } = renderHook(() => useDragController(makeParams()));
    expect(result.current.draggingJokerIndex).toBe(1);
  });

  test("onConsumableDragStart writes the index to the store", () => {
    const { result } = renderHook(() => useDragController(makeParams()));
    act(() => result.current.onConsumableDragStart(3));
    expect(useGame.getState().draggingConsumableIndex).toBe(3);
  });

  test("onConsumableDragEnd clears the drag index in the store", () => {
    useGame.getState().setDraggingConsumableIndex(3);
    const { result } = renderHook(() => useDragController(makeParams()));
    act(() => result.current.onConsumableDragEnd());
    expect(useGame.getState().draggingConsumableIndex).toBeNull();
  });

  test("onConsumableDropOnJokers calls useConsumable with the dragged index", () => {
    const params = makeParams();
    const planet = createPlanetCatalog()[0];
    useGame
      .getState()
      .setConsumables([{ kind: "planet", card: planet }]);
    useGame.getState().setDraggingConsumableIndex(0);
    const { result } = renderHook(() => useDragController(params));
    act(() => result.current.onConsumableDropOnJokers());
    expect(params.useConsumable).toHaveBeenCalledWith(0);
  });

  test("onConsumableDropOnJokers clears the drag index after firing", () => {
    const params = makeParams();
    const planet = createPlanetCatalog()[0];
    useGame
      .getState()
      .setConsumables([{ kind: "planet", card: planet }]);
    useGame.getState().setDraggingConsumableIndex(0);
    const { result } = renderHook(() => useDragController(params));
    act(() => result.current.onConsumableDropOnJokers());
    expect(useGame.getState().draggingConsumableIndex).toBeNull();
  });

  test("onConsumableDropOnDeck calls sellConsumable with the dragged index", () => {
    const params = makeParams();
    const planet = createPlanetCatalog()[0];
    useGame
      .getState()
      .setConsumables([{ kind: "planet", card: planet }]);
    useGame.getState().setDraggingConsumableIndex(0);
    const { result } = renderHook(() => useDragController(params));
    act(() => result.current.onConsumableDropOnDeck());
    expect(params.sellConsumable).toHaveBeenCalledWith(0);
  });

  test("onConsumableDropOnJokers is a no-op when nothing is being dragged (negative)", () => {
    const params = makeParams();
    const { result } = renderHook(() => useDragController(params));
    act(() => result.current.onConsumableDropOnJokers());
    expect(params.useConsumable).not.toHaveBeenCalled();
  });

  test("onJokerDropOnDeck calls sellJoker with the dragged index", () => {
    const params = makeParams();
    useGame.getState().setDraggingJokerIndex(2);
    const { result } = renderHook(() => useDragController(params));
    act(() => result.current.onJokerDropOnDeck());
    expect(params.sellJoker).toHaveBeenCalledWith(2);
  });

  test("onJokerDropOnDeck is a no-op when no joker is being dragged (negative)", () => {
    const params = makeParams();
    const { result } = renderHook(() => useDragController(params));
    act(() => result.current.onJokerDropOnDeck());
    expect(params.sellJoker).not.toHaveBeenCalled();
  });

  test("canDropDraggedConsumableOnJokers is false when nothing is dragged (negative)", () => {
    const { result } = renderHook(() => useDragController(makeParams()));
    expect(result.current.canDropDraggedConsumableOnJokers).toBe(false);
  });

  test("canDropDraggedConsumableOnJokers is true for a usable dragged consumable", () => {
    const planet = createPlanetCatalog()[0];
    useGame
      .getState()
      .setConsumables([{ kind: "planet", card: planet }]);
    useGame.getState().setDraggingConsumableIndex(0);
    const { result } = renderHook(() => useDragController(makeParams()));
    expect(result.current.canDropDraggedConsumableOnJokers).toBe(true);
  });
});
