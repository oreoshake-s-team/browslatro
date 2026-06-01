import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "./game";

describe("animations store", () => {
  beforeEach(() => {
    useGame.getState().resetAnimations();
  });

  test("starts with nopeTriggerKey at 0", () => {
    expect(useGame.getState().nopeTriggerKey).toBe(0);
  });

  test("triggerNope increments nopeTriggerKey", () => {
    useGame.getState().triggerNope();
    expect(useGame.getState().nopeTriggerKey).toBe(1);
  });

  test("triggerNope can be called multiple times sequentially", () => {
    useGame.getState().triggerNope();
    useGame.getState().triggerNope();
    useGame.getState().triggerNope();
    expect(useGame.getState().nopeTriggerKey).toBe(3);
  });

  test("resetAnimations resets nopeTriggerKey back to 0", () => {
    useGame.getState().triggerNope();
    useGame.getState().triggerNope();
    useGame.getState().resetAnimations();
    expect(useGame.getState().nopeTriggerKey).toBe(0);
  });
});
