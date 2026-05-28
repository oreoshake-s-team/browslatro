import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "./game";
import { createPlanetCatalog } from "../items/planets";
import type { Consumable } from "../items/consumables";

const samplePlanet: Consumable = {
  kind: "planet",
  card: createPlanetCatalog()[0],
};

describe("consumables store", () => {
  beforeEach(() => {
    useGame.getState().resetConsumables();
  });

  test("starts with no consumables", () => {
    expect(useGame.getState().consumables).toHaveLength(0);
  });

  test("starts with no dragging index", () => {
    expect(useGame.getState().draggingConsumableIndex).toBeNull();
  });

  test("setDraggingConsumableIndex accepts a plain value", () => {
    useGame.getState().setDraggingConsumableIndex(2);
    expect(useGame.getState().draggingConsumableIndex).toBe(2);
  });

  test("setConsumables accepts an updater function", () => {
    useGame.getState().setConsumables((prev) => [...prev, samplePlanet]);
    expect(useGame.getState().consumables).toHaveLength(1);
  });

  test("resetConsumables clears the dragging index", () => {
    useGame.getState().setDraggingConsumableIndex(1);
    useGame.getState().resetConsumables();
    expect(useGame.getState().draggingConsumableIndex).toBeNull();
  });
});
