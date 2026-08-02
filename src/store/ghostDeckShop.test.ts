// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { chanceOverrideConfig } from "../dev/chanceOverride";
import { useGame } from "./game";

describe("Ghost Deck spectral shop offers", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
    chanceOverrideConfig.force100 = true;
  });

  afterEach(() => {
    chanceOverrideConfig.force100 = false;
  });

  test("the post-round shop can offer spectral cards on the Ghost Deck", () => {
    const game = useGame.getState();
    game.setSelectedDeck("ghost-deck");
    game.handleWin({ interest: 0, interestWallet: 0 });
    const offers = useGame.getState().shopOffers ?? [];
    expect(offers.some((o) => o.kind === "spectral")).toBe(true);
  });

  test("the Red Deck shop never offers spectral cards even at forced odds (negative)", () => {
    const game = useGame.getState();
    game.setSelectedDeck("red-deck");
    game.handleWin({ interest: 0, interestWallet: 0 });
    const offers = useGame.getState().shopOffers ?? [];
    expect(offers.some((o) => o.kind === "spectral")).toBe(false);
  });
});
