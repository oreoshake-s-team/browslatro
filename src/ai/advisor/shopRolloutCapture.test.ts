// @vitest-environment node
import { beforeEach, describe, expect, test } from "vitest";
import type { Card } from "../../cards/types";
import { useGame } from "../../store/game";
import { buildShopRolloutState } from "./shopRolloutCapture";

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
