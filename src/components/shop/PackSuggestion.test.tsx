import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Advice } from "../../ai/advisor/advice";
import { storePlayerKey } from "../../ai/advisor/playerKey";
import { createPlusFourMultJoker } from "../../items/jokers/factories";
import type { PackOffer } from "../../items/packs";
import { createPlanetCatalog } from "../../items/planets";
import { useGame } from "../../store/game";
import PackSuggestion, { type PackSuggestionProps } from "./PackSuggestion";

const { rankState } = vi.hoisted(() => ({
  rankState: { value: [0] as ReadonlyArray<number> },
}));

vi.mock("../../ai/advisor/shopRanker", () => ({
  sharedShopRanker: () => ({
    load: () => Promise.resolve(),
    rankShop: () => Promise.resolve([0]),
    rankPack: () => Promise.resolve(rankState.value),
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
    alternativeIndex: 2,
    whyAlternativeWorse: "Skipping wastes the pack you already paid for.",
    explanation: "The planet levels your most-played hand.",
    concept: "Compound your best hand.",
    ...advice,
  };
}

function packFixture(): PackOffer {
  return {
    pool: "celestial",
    variant: "normal",
    options: [
      { kind: "planet", planet: createPlanetCatalog()[0] },
      { kind: "joker", joker: createPlusFourMultJoker() },
    ],
  };
}

function renderSuggestion(
  overrides: Partial<PackSuggestionProps> = {},
  advice: Advice = adviceFixture(),
) {
  const props: PackSuggestionProps = {
    pack: packFixture(),
    picksRemaining: 1,
    pickedIndices: new Set(),
    jokerSlotsFull: false,
    consumableSlotsFull: false,
    onPick: vi.fn(),
    onClose: vi.fn(),
    suggestionDeps: {
      fetchAdviceFn: vi.fn().mockResolvedValue({ ok: true, advice }),
    },
    ...overrides,
  };
  render(<PackSuggestion {...props} />);
  return props;
}

describe("PackSuggestion coach-first", () => {
  test("auto-shows the local coach pick without any click", async () => {
    renderSuggestion();
    await expect(
      screen.findByTestId("coach-recommendation"),
    ).resolves.toHaveTextContent(/^Pick /);
  });

  test("does not call the LLM when the coach auto-runs", async () => {
    const props = renderSuggestion();
    await screen.findByTestId("coach-recommendation");
    expect(props.suggestionDeps?.fetchAdviceFn).not.toHaveBeenCalled();
  });

  test("applying the coach pick picks the mapped option", async () => {
    const props = renderSuggestion();
    await userEvent.click(await screen.findByTestId("coach-apply"));
    expect(props.onPick).toHaveBeenCalledWith(0);
  });

  test("applying a skip coach pick closes the pack", async () => {
    rankState.value = [2];
    const props = renderSuggestion();
    await userEvent.click(await screen.findByTestId("coach-apply"));
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  test("a picked option maps back to its original index", async () => {
    const props = renderSuggestion({ pickedIndices: new Set([0]) });
    await userEvent.click(await screen.findByTestId("coach-apply"));
    expect(props.onPick).toHaveBeenCalledWith(1);
  });

  test("asking the AI posts a pack-context request", async () => {
    const fetchAdviceFn = vi
      .fn()
      .mockResolvedValue({ ok: true, advice: adviceFixture() });
    renderSuggestion({ suggestionDeps: { fetchAdviceFn } });
    await userEvent.click(await screen.findByTestId("coach-ask-ai"));
    await screen.findByTestId("coach-ai-verdict");
    expect(fetchAdviceFn).toHaveBeenCalledWith(
      expect.objectContaining({ context: "pack" }),
    );
  });

  test("the Ask AI button reads rate-limited without a stored key", async () => {
    renderSuggestion();
    await expect(screen.findByTestId("coach-ask-ai")).resolves.toHaveTextContent(
      "rate-limited",
    );
  });

  test("the Ask AI button drops the rate-limited note when a key is stored", async () => {
    storePlayerKey("sk-ant-test-1234");
    renderSuggestion();
    const button = await screen.findByTestId("coach-ask-ai");
    expect(button).not.toHaveTextContent("rate-limited");
  });

  test("a failed AI request shows the error while keeping the coach pick", async () => {
    renderSuggestion({
      suggestionDeps: {
        fetchAdviceFn: vi
          .fn()
          .mockResolvedValue({ ok: false, code: "model_error" }),
      },
    });
    await userEvent.click(await screen.findByTestId("coach-ask-ai"));
    await screen.findByTestId("coach-ai-error");
    expect(screen.getByTestId("coach-recommendation")).toBeInTheDocument();
  });

  test("dismissing hides the coach panel", async () => {
    renderSuggestion();
    await userEvent.click(await screen.findByTestId("coach-dismiss"));
    expect(screen.queryByTestId("coach-advice")).not.toBeInTheDocument();
  });
});
