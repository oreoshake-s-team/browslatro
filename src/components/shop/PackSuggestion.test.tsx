import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Advice } from "../../ai/advisor/advice";
import { createPlusFourMultJoker } from "../../items/jokers/factories";
import type { PackOffer } from "../../items/packs";
import { createPlanetCatalog } from "../../items/planets";
import { useGame } from "../../store/game";
import PackSuggestion, { type PackSuggestionProps } from "./PackSuggestion";

beforeEach(() => {
  window.localStorage.clear();
  useGame.getState().resetGame();
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

async function suggestAndApply(): Promise<void> {
  await userEvent.click(screen.getByTestId("pack-suggest"));
  await userEvent.click(await screen.findByTestId("suggestion-apply"));
}

describe("PackSuggestion", () => {
  test("the suggest trigger leads with the robot AI glyph", () => {
    renderSuggestion();
    const decoration = screen
      .getByTestId("pack-suggest")
      .querySelector("span[aria-hidden='true']");
    expect(decoration).toHaveTextContent("🤖");
  });

  test("shows the recommended pick after asking for a suggestion", async () => {
    renderSuggestion();
    await userEvent.click(screen.getByTestId("pack-suggest"));
    await expect(
      screen.findByTestId("suggestion-recommendation"),
    ).resolves.toHaveTextContent(/^Pick /);
  });

  test("applying a pick recommendation picks the mapped option", async () => {
    const props = renderSuggestion();
    await suggestAndApply();
    expect(props.onPick).toHaveBeenCalledWith(0);
  });

  test("applying a skip recommendation closes the pack", async () => {
    const props = renderSuggestion(
      {},
      adviceFixture({ recommendationIndex: 2, alternativeIndex: 0 }),
    );
    await suggestAndApply();
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  test("a picked option maps back to its original index", async () => {
    const props = renderSuggestion(
      { pickedIndices: new Set([0]) },
      adviceFixture({ alternativeIndex: 1 }),
    );
    await suggestAndApply();
    expect(props.onPick).toHaveBeenCalledWith(1);
  });

  test("posts a pack-context request", async () => {
    const fetchAdviceFn = vi
      .fn()
      .mockResolvedValue({ ok: true, advice: adviceFixture() });
    renderSuggestion({ suggestionDeps: { fetchAdviceFn } });
    await userEvent.click(screen.getByTestId("pack-suggest"));
    await screen.findByTestId("suggestion-advice");
    expect(fetchAdviceFn).toHaveBeenCalledWith(
      expect.objectContaining({ context: "pack" }),
    );
  });

  test("a failed request shows the error state", async () => {
    renderSuggestion({
      suggestionDeps: {
        fetchAdviceFn: vi
          .fn()
          .mockResolvedValue({ ok: false, code: "model_error" }),
      },
    });
    await userEvent.click(screen.getByTestId("pack-suggest"));
    await expect(
      screen.findByTestId("suggestion-error"),
    ).resolves.toBeInTheDocument();
  });

  test("the trigger renders into the provided container instead of inline", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    renderSuggestion({ triggerContainer: container });
    expect(container.contains(screen.getByTestId("pack-suggest"))).toBe(true);
    container.remove();
  });

  test("the advice panel stays in the inline host when the trigger is portaled", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    renderSuggestion({ triggerContainer: container });
    await userEvent.click(screen.getByTestId("pack-suggest"));
    const panel = await screen.findByTestId("suggestion-advice");
    expect(container.contains(panel)).toBe(false);
    container.remove();
  });

  test("negative: the trigger renders inline when no container is provided", () => {
    renderSuggestion();
    const suggest = screen.getByTestId("pack-suggest");
    expect(suggest.closest(".pack-suggestion")).not.toBeNull();
  });
});
