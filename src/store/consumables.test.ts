import { beforeEach, describe, expect, test } from "vitest";
import { useConsumables } from "./consumables";
import { createPlanetCatalog } from "../items/planets";
import type { Consumable } from "../items/consumables";

const samplePlanet: Consumable = {
  kind: "planet",
  card: createPlanetCatalog()[0],
};

describe("consumables store", () => {
  beforeEach(() => {
    useConsumables.getState().resetConsumables();
  });

  test("starts with no consumables", () => {
    expect(useConsumables.getState().consumables).toHaveLength(0);
  });

  test("starts with no dragging index", () => {
    expect(useConsumables.getState().draggingConsumableIndex).toBeNull();
  });

  test("setDraggingConsumableIndex accepts a plain value", () => {
    useConsumables.getState().setDraggingConsumableIndex(2);
    expect(useConsumables.getState().draggingConsumableIndex).toBe(2);
  });

  test("setConsumables accepts an updater function", () => {
    useConsumables.getState().setConsumables((prev) => [...prev, samplePlanet]);
    expect(useConsumables.getState().consumables).toHaveLength(1);
  });

  test("resetConsumables clears the dragging index", () => {
    useConsumables.getState().setDraggingConsumableIndex(1);
    useConsumables.getState().resetConsumables();
    expect(useConsumables.getState().draggingConsumableIndex).toBeNull();
  });
});
