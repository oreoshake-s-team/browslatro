import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Advice } from "../../ai/advisor/advice";
import { storePlayerKey } from "../../ai/advisor/playerKey";
import { humanPlayLog } from "../../ai/humanPlayWiring";
import { createPlusFourMultJoker } from "../../items/jokers/factories";
import type { ShopItem } from "../../items/shop";
import { useGame } from "../../store/game";
import ShopSuggestion, { type ShopSuggestionProps } from "./ShopSuggestion";

const { rankState } = vi.hoisted(() => ({
  rankState: { value: [0] as ReadonlyArray<number> },
}));

vi.mock("../../ai/advisor/shopRanker", async (importActual) => ({
  ...(await importActual<typeof import("../../ai/advisor/shopRanker")>()),
  sharedShopRanker: () => ({
    load: () => Promise.resolve(),
    rankShop: () => Promise.resolve(rankState.value),
    rankPack: () => Promise.resolve([0]),
  }),
}));

beforeEach(() => {
  window.localStorage.clear();
  useGame.getState().resetGame();
  rankState.value = [0];
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

async function revealCoachPick(): Promise<void> {
  await userEvent.click(screen.getByTestId("coach-trigger"));
}

describe("ShopSuggestion click-to-reveal", () => {
  test("shows a Coach tip trigger, not the panel, by default", () => {
    renderSuggestion();
    expect(screen.getByTestId("coach-trigger")).toBeInTheDocument();
  });

  test("the coach panel is not shown until the trigger is clicked", () => {
    renderSuggestion();
    expect(screen.queryByTestId("coach-advice")).not.toBeInTheDocument();
  });

  test("clicking the trigger reveals the local coach recommendation", async () => {
    renderSuggestion();
    await revealCoachPick();
    await expect(
      screen.findByTestId("coach-recommendation"),
    ).resolves.toHaveTextContent("Buy +4 Mult for $5");
  });

  test("revealing the coach does not call the LLM", async () => {
    const props = renderSuggestion();
    await revealCoachPick();
    await screen.findByTestId("coach-recommendation");
    expect(props.suggestionDeps?.fetchAdviceFn).not.toHaveBeenCalled();
  });

  test("applying the coach pick buys the mapped offer", async () => {
    const props = renderSuggestion();
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("coach-apply"));
    expect(props.onBuy).toHaveBeenCalledWith(0);
  });

  test("applying a reroll coach pick uses the shop reroll path", async () => {
    rankState.value = [1];
    const props = renderSuggestion();
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("coach-apply"));
    expect(props.onApplyReroll).toHaveBeenCalledOnce();
  });

  test("applying a leave coach pick closes the shop", async () => {
    rankState.value = [2];
    const props = renderSuggestion();
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("coach-apply"));
    expect(props.onNext).toHaveBeenCalledOnce();
  });

  test("the Ask AI button reads rate-limited without a stored key", async () => {
    renderSuggestion();
    await revealCoachPick();
    await expect(screen.findByTestId("coach-ask-ai")).resolves.toHaveTextContent(
      "rate-limited",
    );
  });

  test("the Ask AI button drops the rate-limited note when a key is stored", async () => {
    storePlayerKey("sk-ant-test-1234");
    renderSuggestion();
    await revealCoachPick();
    const button = await screen.findByTestId("coach-ask-ai");
    expect(button).not.toHaveTextContent("rate-limited");
  });

  test("asking the AI calls the LLM and annotates agreement with the coach", async () => {
    const props = renderSuggestion();
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("coach-ask-ai"));
    const verdict = await screen.findByTestId("coach-ai-verdict");
    expect(props.suggestionDeps?.fetchAdviceFn).toHaveBeenCalledOnce();
    expect(verdict).toHaveTextContent("AI agrees");
  });

  test("the AI annotation flags disagreement with the coach pick", async () => {
    renderSuggestion({}, adviceFixture({ recommendationIndex: 1 }));
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("coach-ask-ai"));
    await expect(
      screen.findByTestId("coach-ai-verdict"),
    ).resolves.toHaveTextContent("AI suggests Reroll the shop for $5 instead");
  });

  test("a failed AI request shows the error while keeping the coach pick", async () => {
    renderSuggestion({
      suggestionDeps: {
        fetchAdviceFn: vi
          .fn()
          .mockResolvedValue({ ok: false, code: "model_error" }),
      },
    });
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("coach-ask-ai"));
    await screen.findByTestId("coach-ai-error");
    expect(screen.getByTestId("coach-recommendation")).toBeInTheDocument();
  });

  test("dismissing collapses the panel back to the trigger", async () => {
    renderSuggestion();
    await revealCoachPick();
    await userEvent.click(screen.getByTestId("coach-dismiss"));
    expect(screen.queryByTestId("coach-advice")).not.toBeInTheDocument();
    expect(screen.getByTestId("coach-trigger")).toBeInTheDocument();
  });

  test("the trigger is disabled while the shop is locked", () => {
    renderSuggestion({ disabled: true });
    expect(screen.getByTestId("coach-trigger")).toBeDisabled();
  });

  test("the revealed coach panel offers a bad-pick affordance", async () => {
    renderSuggestion();
    await revealCoachPick();
    await expect(
      screen.findByTestId("advice-feedback-open"),
    ).resolves.toBeInTheDocument();
  });

  test("a corrective pick records a policy advice-feedback event", async () => {
    renderSuggestion();
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("advice-feedback-open"));
    await userEvent.click(screen.getByTestId("advice-feedback-option-1"));
    await userEvent.click(screen.getByTestId("advice-feedback-submit"));
    expect(humanPlayLog().counts()["advice-feedback"]).toBe(1);
  });

  test("submitting feedback dismisses the panel and confirms", async () => {
    renderSuggestion();
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("advice-feedback-open"));
    await userEvent.click(screen.getByTestId("advice-feedback-just-bad"));
    expect(screen.queryByTestId("coach-advice")).not.toBeInTheDocument();
    expect(screen.getByTestId("coach-feedback-recorded")).toBeInTheDocument();
  });

  test("an applied coach purchase is not recorded as human play, while a manual one after it is", async () => {
    useGame.getState().setMoney(20);
    useGame.getState().setShopOffers([jokerOffer(), jokerOffer()]);
    renderSuggestion({
      onBuy: (offerIdx) => useGame.getState().buyShopOffer(offerIdx),
    });
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("coach-apply"));
    expect(humanPlayLog().count()).toBe(0);
    useGame.getState().buyShopOffer(1);
    expect(humanPlayLog().counts()).toEqual({ purchase: 1 });
  });
});
