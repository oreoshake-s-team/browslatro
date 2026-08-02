// @vitest-environment node
import { beforeEach, describe, expect, test } from "vitest";
import { useGame } from "./game";

describe("Anaglyph Deck boss-defeat Double Tag", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("defeating a Boss Blind grants a Double Tag", () => {
    const game = useGame.getState();
    game.setSelectedDeck("anaglyph-deck");
    game.setBlind(3);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().pendingTags).toContain("double");
  });

  test("the grant survives a deferred boss payout clearing pending tags", () => {
    const game = useGame.getState();
    game.setSelectedDeck("anaglyph-deck");
    game.setBlind(3);
    game.setPendingTags(["investment"]);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().pendingTags).toEqual(["double"]);
  });

  test("winning a non-boss blind grants nothing (negative)", () => {
    const game = useGame.getState();
    game.setSelectedDeck("anaglyph-deck");
    game.setBlind(1);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().pendingTags).toHaveLength(0);
  });

  test("the Red Deck grants nothing on a boss defeat (negative)", () => {
    const game = useGame.getState();
    game.setSelectedDeck("red-deck");
    game.setBlind(3);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().pendingTags).toHaveLength(0);
  });
});
