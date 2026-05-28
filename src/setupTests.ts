import "@testing-library/jest-dom";
import { STARTING_MONEY, useEconomy } from "./store/economy";
import { useVouchers } from "./store/vouchers";
import { useStats } from "./store/stats";
import { useProgression } from "./store/progression";
import { useConsumables } from "./store/consumables";
import { useJokers } from "./store/jokers";
import { useShop } from "./store/shop";
import { usePacks } from "./store/packs";
import { useHand } from "./store/hand";
import { useScoring } from "./store/scoring";
import { useDevModifiers } from "./store/devModifiers";

beforeEach(() => {
  useEconomy.setState({ money: STARTING_MONEY });
  useVouchers.getState().resetVouchers();
  useStats.getState().resetStats();
  useStats.getState().setHandPlaySignal(0);
  useProgression.getState().resetProgression();
  useConsumables.getState().resetConsumables();
  useJokers.getState().resetJokers();
  useShop.getState().resetShop();
  usePacks.getState().resetPacks();
  useHand.getState().resetHand();
  useScoring.getState().resetScoring();
  useDevModifiers.getState().resetDevModifiers();
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
