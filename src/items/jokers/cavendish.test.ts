// @vitest-environment node
import {
  CAVENDISH_X_MULT,
  applyHandLevelJokers,
  applyRoundEndToJokerStates,
  createCavendishJoker,
  createGrosMichelJoker,
  createJokerCatalog,
} from "../jokers";
import type { Joker } from "../jokers";
import { useGame } from "../../store/game";

describe("Cavendish (#988)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("cavendish");
  });

  test("applies X3 Mult to every played hand", () => {
    const result = applyHandLevelJokers([createCavendishJoker()], {
      playedHandLabel: "Pair",
    });
    expect(result.xMult).toBe(CAVENDISH_X_MULT);
  });

  test("goes extinct at round end when the 1-in-1000 roll hits", () => {
    const jokers = applyRoundEndToJokerStates(
      [createCavendishJoker()],
      () => 0,
    );
    expect(jokers).toHaveLength(0);
  });

  test("survives the round when the roll misses (negative)", () => {
    const jokers = applyRoundEndToJokerStates(
      [createCavendishJoker()],
      () => 0.99,
    );
    expect(jokers).toHaveLength(1);
  });

  test("an eternal Cavendish survives a losing roll", () => {
    const eternal: Joker = {
      ...createCavendishJoker(),
      stickers: [{ kind: "eternal" }],
    };
    expect(applyRoundEndToJokerStates([eternal], () => 0)).toHaveLength(1);
  });
});

describe("Cavendish spawn gating (#988)", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("a Gros Michel extinction sets the run flag", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const game = useGame.getState();
    game.setJokers([createGrosMichelJoker()]);
    game.setBlind(1);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().grosMichelDestroyed).toBe(true);
  });

  test("a surviving Gros Michel leaves the flag unset (negative)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const game = useGame.getState();
    game.setJokers([createGrosMichelJoker()]);
    game.setBlind(1);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().grosMichelDestroyed).toBe(false);
  });

  test("a new game clears the flag", () => {
    useGame.getState().setGrosMichelDestroyed(true);
    useGame.getState().resetGame();
    expect(useGame.getState().grosMichelDestroyed).toBe(false);
  });
});
