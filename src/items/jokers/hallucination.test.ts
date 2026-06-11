// @vitest-environment node
import {
  createHallucinationJoker,
  createJokerCatalog,
} from "../jokers";
import { useGame } from "../../store/game";

function packOffer() {
  const shop = useGame.getState().shopOffers;
  if (!shop) throw new Error("no shop offers");
  return shop.findIndex((o) => o.kind === "pack");
}

beforeEach(() => {
  useGame.getState().resetGame();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Hallucination", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("hallucination");
  });

  test("opening a pack creates a tarot when the roll hits", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const game = useGame.getState();
    game.handleWin({ interest: 0, interestWallet: 0 });
    game.setJokers([createHallucinationJoker()]);
    game.setMoney(50);
    game.setConsumables([]);
    const idx = packOffer();
    if (idx === -1) throw new Error("no pack in shop");
    useGame.getState().openPack(idx);
    expect(
      useGame.getState().consumables.filter((c) => c.kind === "tarot"),
    ).toHaveLength(1);
  });

  test("a missed roll creates nothing (negative)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.99);
    const game = useGame.getState();
    game.handleWin({ interest: 0, interestWallet: 0 });
    game.setJokers([createHallucinationJoker()]);
    game.setMoney(50);
    game.setConsumables([]);
    const idx = packOffer();
    if (idx === -1) throw new Error("no pack in shop");
    useGame.getState().openPack(idx);
    expect(useGame.getState().consumables).toHaveLength(0);
  });

  test("opening a pack without Hallucination creates nothing (negative)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const game = useGame.getState();
    game.handleWin({ interest: 0, interestWallet: 0 });
    game.setJokers([]);
    game.setMoney(50);
    game.setConsumables([]);
    const idx = packOffer();
    if (idx === -1) throw new Error("no pack in shop");
    useGame.getState().openPack(idx);
    expect(useGame.getState().consumables).toHaveLength(0);
  });
});
