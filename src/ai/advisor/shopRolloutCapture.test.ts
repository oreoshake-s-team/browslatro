// @vitest-environment node
import { beforeEach, describe, expect, test } from "vitest";
import type { Card } from "../../cards/types";
import type { Consumable } from "../../items/consumables";
import { createPlusFourMultJoker } from "../../items/jokers/factories";
import { createPlanetCatalog } from "../../items/planets";
import { useGame } from "../../store/game";
import { buildShopRolloutState, shopBuildFromState } from "./shopRolloutCapture";

function planetConsumable(index: number): Consumable {
  return { kind: "planet", card: createPlanetCatalog()[index] };
}

beforeEach(() => {
  useGame.getState().resetGame();
});

const NO_OFFERS = [] as const;

describe("buildShopRolloutState", () => {
  test("captures the current jokers", () => {
    expect(buildShopRolloutState(useGame.getState(), NO_OFFERS).jokers).toBe(
      useGame.getState().jokers,
    );
  });

  test("captures the hand stats", () => {
    expect(buildShopRolloutState(useGame.getState(), NO_OFFERS).handStats).toBe(
      useGame.getState().handStats,
    );
  });

  test("builds the full deck from the owned cards", () => {
    const cards: Card[] = [
      { id: 1, rank: "9", suit: "hearts" },
      { id: 2, rank: "K", suit: "spades" },
    ];
    useGame.getState().setBaseDeckCards(cards);
    expect(buildShopRolloutState(useGame.getState(), NO_OFFERS).deck).toHaveLength(2);
  });

  test("passes the offers through", () => {
    expect(buildShopRolloutState(useGame.getState(), NO_OFFERS).offers).toBe(
      NO_OFFERS,
    );
  });
});

describe("shopBuildFromState", () => {
  test("captures owned jokers into the build", () => {
    useGame.getState().setJokers([createPlusFourMultJoker()]);
    expect(shopBuildFromState(useGame.getState()).jokers).toHaveLength(1);
  });

  test("reflects leveled-up hands", () => {
    useGame
      .getState()
      .setHandStats((prev) => ({ ...prev, Pair: { ...prev.Pair, level: 5 } }));
    expect(shopBuildFromState(useGame.getState()).handLevels.Pair).toBe(5);
  });

  test("reflects the consumables held count", () => {
    expect(shopBuildFromState(useGame.getState()).consumablesHeld).toBe(0);
  });

  test("reflects the real consumables held count for the v11 policy", () => {
    useGame
      .getState()
      .setConsumables([planetConsumable(0), planetConsumable(1)]);
    expect(shopBuildFromState(useGame.getState()).consumablesHeld).toBe(2);
  });
});
