// @vitest-environment node
import {
  GIFT_CARD_SELL_VALUE_PER_ROUND,
  applyGiftCardToJokerSellValues,
  createGiftCardJoker,
  createJokerCatalog,
  jokerSellValue,
} from "../jokers";
import { consumableSellValue } from "../consumables";
import { useGame } from "../../store/game";
import { createTarotCatalog } from "../tarots";

describe("Gift Card", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("gift-card");
  });

  test("a round end raises every joker's sell value", () => {
    const other = createJokerCatalog()[0];
    const jokers = applyGiftCardToJokerSellValues([
      createGiftCardJoker(),
      other,
    ]);
    expect(jokerSellValue(jokers[1])).toBe(
      jokerSellValue(other) + GIFT_CARD_SELL_VALUE_PER_ROUND,
    );
  });

  test("the bonus compounds over rounds", () => {
    const jokers = applyGiftCardToJokerSellValues(
      applyGiftCardToJokerSellValues([createGiftCardJoker()]),
    );
    expect(jokerSellValue(jokers[0])).toBe(
      jokerSellValue(createGiftCardJoker()) +
        2 * GIFT_CARD_SELL_VALUE_PER_ROUND,
    );
  });

  test("without Gift Card nothing grows (negative)", () => {
    const other = createJokerCatalog()[0];
    const [updated] = applyGiftCardToJokerSellValues([other]);
    expect(jokerSellValue(updated)).toBe(jokerSellValue(other));
  });

  test("a consumable's sell bonus raises its sale price", () => {
    const tarot = createTarotCatalog()[0];
    const base = consumableSellValue({ kind: "tarot", card: tarot });
    expect(
      consumableSellValue({ kind: "tarot", card: tarot, sellBonus: 2 }),
    ).toBe(base + 2);
  });

  test("handleWin bumps consumable sell bonuses when Gift Card is held", () => {
    useGame.getState().resetGame();
    const game = useGame.getState();
    game.setJokers([createGiftCardJoker()]);
    game.setConsumables([
      { kind: "tarot", card: createTarotCatalog()[0] },
    ]);
    game.setBlind(1);
    game.handleWin({ interest: 0, interestWallet: 0 });
    expect(useGame.getState().consumables[0].sellBonus).toBe(
      GIFT_CARD_SELL_VALUE_PER_ROUND,
    );
  });
});
