import "@testing-library/jest-dom";
import { STARTING_MONEY, useEconomy } from "./store/economy";
import { useVouchers } from "./store/vouchers";

beforeEach(() => {
  useEconomy.setState({ money: STARTING_MONEY });
  useVouchers.getState().resetVouchers();
  if (typeof window !== "undefined") {
    vi.spyOn(window, "confirm").mockReturnValue(true);
  }
});

if (typeof globalThis.AnimationEvent === "undefined") {
  class AnimationEventPolyfill extends Event {
    animationName: string;
    elapsedTime: number;
    pseudoElement: string;
    constructor(
      type: string,
      init: AnimationEventInit & EventInit = {},
    ) {
      super(type, init);
      this.animationName = init.animationName ?? "";
      this.elapsedTime = init.elapsedTime ?? 0;
      this.pseudoElement = init.pseudoElement ?? "";
    }
  }
  (globalThis as unknown as { AnimationEvent: typeof AnimationEventPolyfill }).AnimationEvent =
    AnimationEventPolyfill;
}
