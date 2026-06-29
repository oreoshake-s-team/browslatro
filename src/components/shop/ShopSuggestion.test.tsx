import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Advice } from "../../ai/advisor/advice";
import { storePlayerKey } from "../../ai/advisor/playerKey";
import { humanPlayLog } from "../../ai/humanPlayWiring";
import {
  clearShopAdvice,
  matchedShopDisagreement,
} from "../../ai/advisor/shownShopAdvice";
import type { Consumable } from "../../items/consumables";
import { createPlusFourMultJoker } from "../../items/jokers/factories";
import { createPlanetCatalog } from "../../items/planets";
import { createTarotCatalog } from "../../items/tarots";
import type { ShopItem } from "../../items/shop";
import { useGame } from "../../store/game";
import ShopSuggestion, { type ShopSuggestionProps } from "./ShopSuggestion";

function planetConsumable(): Consumable {
  return { kind: "planet", card: createPlanetCatalog()[0] };
}

function targetTarot(): Consumable {
  const card = createTarotCatalog().find((t) => t.effect.kind === "convert-suit");
  if (card === undefined) throw new Error("expected a convert-suit tarot");
  return { kind: "tarot", card };
}

const { rankState } = vi.hoisted(() => ({
  rankState: {
    value: [0] as ReadonlyArray<number>,
    lastInput: null as { build?: { jokers: ReadonlyArray<unknown> }; round?: number } | null,
  },
}));

vi.mock("../../ai/advisor/shopRanker", async (importActual) => ({
  ...(await importActual<typeof import("../../ai/advisor/shopRanker")>()),
  sharedShopRanker: () => ({
    load: () => Promise.resolve(),
    rankShop: (input: { build?: { jokers: ReadonlyArray<unknown> }; round?: number }) => {
      rankState.lastInput = input;
      return Promise.resolve(rankState.value);
    },
    rankPack: () => Promise.resolve([0]),
  }),
}));

beforeEach(() => {
  window.localStorage.clear();
  useGame.getState().resetGame();
  rankState.value = [0];
  rankState.lastInput = null;
  clearShopAdvice();
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
    money: 30,
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

describe("ShopSuggestion build context", () => {
  test("passes the player's real build to the ranker", async () => {
    useGame.getState().setJokers([createPlusFourMultJoker()]);
    renderSuggestion();
    await revealCoachPick();
    await waitFor(() =>
      expect(rankState.lastInput?.build?.jokers).toHaveLength(1),
    );
  });

  test("passes the real round counter to the ranker", async () => {
    useGame.getState().setRound(7);
    renderSuggestion();
    await revealCoachPick();
    await waitFor(() => expect(rankState.lastInput?.round).toBe(7));
  });
});

describe("ShopSuggestion consumable use", () => {
  test("applying a no-target use suggestion removes the consumable from the tray", async () => {
    useGame.getState().setConsumables([planetConsumable()]);
    rankState.value = [1];
    renderSuggestion();
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("advice-feedback-agree"));
    await waitFor(() =>
      expect(useGame.getState().consumables).toHaveLength(0),
    );
  });

  test("disables apply for a target-requiring use suggestion", async () => {
    useGame.getState().setConsumables([targetTarot()]);
    rankState.value = [1];
    renderSuggestion();
    await revealCoachPick();
    await waitFor(() =>
      expect(screen.getByTestId("advice-feedback-agree")).toBeDisabled(),
    );
  });

  test("shows the use-during-the-blind note for a target-requiring suggestion", async () => {
    useGame.getState().setConsumables([targetTarot()]);
    rankState.value = [1];
    renderSuggestion();
    await revealCoachPick();
    await waitFor(() =>
      expect(screen.getByTestId("advice-feedback-agree-blocked")).toBeInTheDocument(),
    );
  });
});

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
    await userEvent.click(await screen.findByTestId("advice-feedback-agree"));
    expect(props.onBuy).toHaveBeenCalledWith(0);
  });

  test("applying a reroll coach pick uses the shop reroll path", async () => {
    rankState.value = [1];
    const props = renderSuggestion();
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("advice-feedback-agree"));
    expect(props.onApplyReroll).toHaveBeenCalledOnce();
  });

  test("applying a leave coach pick closes the shop", async () => {
    rankState.value = [2];
    const props = renderSuggestion();
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("advice-feedback-agree"));
    expect(props.onNext).toHaveBeenCalledOnce();
  });

  test("the coach trigger returns after applying a pick so you can ask again", async () => {
    renderSuggestion();
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("advice-feedback-agree"));
    expect(screen.getByTestId("coach-trigger")).toBeInTheDocument();
  });

  test("re-opening the coach after acting shows a fresh recommendation", async () => {
    renderSuggestion();
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("advice-feedback-agree"));
    await userEvent.click(screen.getByTestId("coach-trigger"));
    expect(
      await screen.findByTestId("coach-recommendation"),
    ).toBeInTheDocument();
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

  test("a corrected buy pick auto-buys the chosen offer", async () => {
    rankState.value = [1];
    const props = renderSuggestion();
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("advice-feedback-open"));
    await userEvent.click(screen.getByTestId("advice-feedback-option-0"));
    await userEvent.click(screen.getByTestId("advice-feedback-submit"));
    expect(props.onBuy).toHaveBeenCalledWith(0);
  });

  test("a corrected reroll pick auto-rerolls", async () => {
    const props = renderSuggestion();
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("advice-feedback-open"));
    await userEvent.click(screen.getByTestId("advice-feedback-option-1"));
    await userEvent.click(screen.getByTestId("advice-feedback-submit"));
    expect(props.onApplyReroll).toHaveBeenCalledOnce();
  });

  test("a corrected leave pick exits the shop", async () => {
    const props = renderSuggestion();
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("advice-feedback-open"));
    await userEvent.click(screen.getByTestId("advice-feedback-option-2"));
    await userEvent.click(screen.getByTestId("advice-feedback-submit"));
    expect(props.onNext).toHaveBeenCalledOnce();
  });

  test("a bare downvote executes no shop action (negative)", async () => {
    const props = renderSuggestion();
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("advice-feedback-open"));
    await userEvent.click(screen.getByTestId("advice-feedback-just-bad"));
    expect(props.onBuy).not.toHaveBeenCalled();
  });

  test("the corrective submit reads 'Do this instead'", async () => {
    renderSuggestion();
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("advice-feedback-open"));
    expect(screen.getByTestId("advice-feedback-submit")).toHaveTextContent(
      "Do this instead",
    );
  });

  test("the recorded feedback carries the rollout state for gating", async () => {
    renderSuggestion();
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("advice-feedback-open"));
    await userEvent.click(screen.getByTestId("advice-feedback-just-bad"));
    const record = JSON.parse(humanPlayLog().toJsonl().trim());
    expect(record.decision.rollout).toBeDefined();
  });

  test("submitting feedback dismisses the panel and confirms", async () => {
    renderSuggestion();
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("advice-feedback-open"));
    await userEvent.click(screen.getByTestId("advice-feedback-just-bad"));
    expect(screen.queryByTestId("coach-advice")).not.toBeInTheDocument();
    expect(screen.getByTestId("coach-feedback-recorded")).toBeInTheDocument();
  });

  test("revealing the coach remembers the pick for auto-disagreement", async () => {
    renderSuggestion();
    await revealCoachPick();
    await screen.findByTestId("coach-recommendation");
    expect(matchedShopDisagreement({ kind: "reroll", cost: 5 })).not.toBeNull();
  });

  test("an explicit downvote clears the remembered pick (dedup)", async () => {
    renderSuggestion();
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("advice-feedback-open"));
    await userEvent.click(screen.getByTestId("advice-feedback-just-bad"));
    expect(matchedShopDisagreement({ kind: "reroll", cost: 5 })).toBeNull();
  });

  test("an applied coach pick records feedback but no phantom purchase, while a later manual buy is a purchase", async () => {
    useGame.getState().setMoney(20);
    useGame.getState().setShopOffers([jokerOffer(), jokerOffer()]);
    renderSuggestion({
      onBuy: (offerIdx) => useGame.getState().buyShopOffer(offerIdx),
    });
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("advice-feedback-agree"));
    expect(humanPlayLog().counts().purchase).toBeUndefined();
    useGame.getState().buyShopOffer(1);
    expect(humanPlayLog().counts().purchase).toBe(1);
  });
});
