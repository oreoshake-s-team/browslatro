import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Advice } from "../../ai/advisor/advice";
import { humanPlayLog } from "../../ai/humanPlayWiring";
import { createPlusFourMultJoker } from "../../items/jokers/factories";
import type { ShopItem } from "../../items/shop";
import { useGame } from "../../store/game";
import ShopSuggestion, { type ShopSuggestionProps } from "./ShopSuggestion";

beforeEach(() => {
  window.localStorage.clear();
  useGame.getState().resetGame();
});

function adviceFixture(advice?: Partial<Advice>): Advice {
  return {
    recommendationIndex: 0,
    alternativeIndex: 1,
    whyAlternativeWorse: "Leaving banks nothing this ante.",
    explanation: "Jolly Joker scales every pair hand.",
    concept: "Buy engine pieces early.",
    ...advice,
  };
}

function jokerOffer(): ShopItem {
  return {
    kind: "joker",
    joker: createPlusFourMultJoker(),
    price: 5,
    sold: false,
  };
}

function renderSuggestion(
  overrides: Partial<ShopSuggestionProps> = {},
  advice: Advice = adviceFixture(),
) {
  const props: ShopSuggestionProps = {
    money: 20,
    equippedJokerCount: 0,
    jokerCapacity: 5,
    consumableCount: 0,
    consumableCapacity: 2,
    offers: [jokerOffer()],
    vouchers: [],
    soldVoucherIds: new Set(),
    ownedVoucherIds: new Set(),
    rerollCost: 5,
    disabled: false,
    onBuy: vi.fn(),
    onBuyVoucher: vi.fn(),
    onApplyReroll: vi.fn(),
    onNext: vi.fn(),
    suggestionDeps: {
      fetchAdviceFn: vi.fn().mockResolvedValue({ ok: true, advice }),
    },
    ...overrides,
  };
  render(<ShopSuggestion {...props} />);
  return props;
}

async function suggestAndApply(): Promise<void> {
  await userEvent.click(screen.getByTestId("shop-suggest"));
  await userEvent.click(await screen.findByTestId("suggestion-apply"));
}

describe("ShopSuggestion", () => {
  test("shows the recommendation after asking for a suggestion", async () => {
    renderSuggestion();
    await userEvent.click(screen.getByTestId("shop-suggest"));
    await expect(
      screen.findByTestId("suggestion-recommendation"),
    ).resolves.toHaveTextContent("Buy +4 Mult for $5");
  });

  test("applying a buy recommendation buys the mapped offer", async () => {
    const props = renderSuggestion();
    await suggestAndApply();
    expect(props.onBuy).toHaveBeenCalledWith(0);
  });

  test("applying a leave recommendation closes the shop", async () => {
    const props = renderSuggestion({}, adviceFixture({ recommendationIndex: 2, alternativeIndex: 0 }));
    await suggestAndApply();
    expect(props.onNext).toHaveBeenCalledOnce();
  });

  test("applying a reroll recommendation uses the shop reroll path", async () => {
    const props = renderSuggestion({}, adviceFixture({ recommendationIndex: 1, alternativeIndex: 0 }));
    await suggestAndApply();
    expect(props.onApplyReroll).toHaveBeenCalledOnce();
  });

  test("applying clears the advice panel", async () => {
    renderSuggestion();
    await suggestAndApply();
    expect(screen.queryByTestId("suggestion-advice")).not.toBeInTheDocument();
  });

  test("an applied purchase is not recorded as human play, while a manual one after it is", async () => {
    useGame.getState().setMoney(20);
    useGame.getState().setShopOffers([jokerOffer(), jokerOffer()]);
    renderSuggestion({
      onBuy: (offerIdx) => useGame.getState().buyShopOffer(offerIdx),
    });
    await suggestAndApply();
    expect(humanPlayLog().count()).toBe(0);
    useGame.getState().buyShopOffer(1);
    expect(humanPlayLog().counts()).toEqual({ purchase: 1 });
  });

  test("the suggest button is disabled while the shop is locked", () => {
    renderSuggestion({ disabled: true });
    expect(screen.getByTestId("shop-suggest")).toBeDisabled();
  });

  test("a failed request shows the error state", async () => {
    renderSuggestion({
      suggestionDeps: {
        fetchAdviceFn: vi
          .fn()
          .mockResolvedValue({ ok: false, code: "model_error" }),
      },
    });
    await userEvent.click(screen.getByTestId("shop-suggest"));
    await expect(
      screen.findByTestId("suggestion-error"),
    ).resolves.toBeInTheDocument();
  });
});
