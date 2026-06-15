import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Advice } from "../../ai/advisor/advice";
import { captureRunEvent, humanPlayLog } from "../../ai/humanPlayWiring";
import { createBossCatalog } from "../../items/bosses";
import { useGame } from "../../store/game";
import BlindSuggestion, { type BlindSuggestionProps } from "./BlindSuggestion";

beforeEach(() => {
  window.localStorage.clear();
  useGame.getState().resetGame();
});

function adviceFixture(advice?: Partial<Advice>): Advice {
  return {
    recommendationIndex: 1,
    alternativeIndex: 0,
    whyAlternativeWorse: "The payout is small and the boss is manageable.",
    explanation: "The tag outweighs three dollars here.",
    concept: "Skip cheap blinds for compounding rewards.",
    ...advice,
  };
}

function renderSuggestion(
  overrides: Partial<BlindSuggestionProps> = {},
  advice: Advice = adviceFixture(),
) {
  const props: BlindSuggestionProps = {
    ante: 2,
    currentBlind: 1,
    boss: createBossCatalog()[0],
    stake: "white",
    skipRewards: { small: { id: "charm" }, big: { id: "investment" } },
    onPlay: vi.fn(),
    onSkip: vi.fn(),
    suggestionDeps: {
      fetchAdviceFn: vi.fn().mockResolvedValue({ ok: true, advice }),
    },
    ...overrides,
  };
  render(<BlindSuggestion {...props} />);
  return props;
}

async function suggestAndApply(): Promise<void> {
  await userEvent.click(screen.getByTestId("blind-suggest"));
  await userEvent.click(await screen.findByTestId("suggestion-apply"));
}

describe("BlindSuggestion", () => {
  test("the suggest trigger leads with the robot AI glyph", () => {
    renderSuggestion();
    const decoration = screen
      .getByTestId("blind-suggest")
      .querySelector("span[aria-hidden='true']");
    expect(decoration).toHaveTextContent("🤖");
  });

  test("describes a skip recommendation with the tag name", async () => {
    renderSuggestion();
    await userEvent.click(screen.getByTestId("blind-suggest"));
    await expect(
      screen.findByTestId("suggestion-recommendation"),
    ).resolves.toHaveTextContent(/^Skip it for the /);
  });

  test("describes a play recommendation with the payout", async () => {
    renderSuggestion({}, adviceFixture({ recommendationIndex: 0, alternativeIndex: 1 }));
    await userEvent.click(screen.getByTestId("blind-suggest"));
    await expect(
      screen.findByTestId("suggestion-recommendation"),
    ).resolves.toHaveTextContent(/^Play the blind /);
  });

  test("applying a skip recommendation skips the blind", async () => {
    const props = renderSuggestion();
    await suggestAndApply();
    expect(props.onSkip).toHaveBeenCalledOnce();
  });

  test("applying a play recommendation plays the blind", async () => {
    const props = renderSuggestion(
      {},
      adviceFixture({ recommendationIndex: 0, alternativeIndex: 1 }),
    );
    await suggestAndApply();
    expect(props.onPlay).toHaveBeenCalledOnce();
  });

  test("posts a blind-context request", async () => {
    const fetchAdviceFn = vi
      .fn()
      .mockResolvedValue({ ok: true, advice: adviceFixture() });
    renderSuggestion({ suggestionDeps: { fetchAdviceFn } });
    await userEvent.click(screen.getByTestId("blind-suggest"));
    await screen.findByTestId("suggestion-advice");
    expect(fetchAdviceFn).toHaveBeenCalledWith(
      expect.objectContaining({ context: "blind" }),
    );
  });

  test("an applied skip is not logged as a human decision, while a manual skip after it is", async () => {
    const recordSkip = (): boolean =>
      captureRunEvent(useGame.getState(), { kind: "blind-skip", tag: null });
    renderSuggestion({
      onSkip: () => {
        recordSkip();
      },
    });
    await suggestAndApply();
    expect(humanPlayLog().count()).toBe(0);
    recordSkip();
    expect(humanPlayLog().counts()).toEqual({ "blind-skip": 1 });
  });

  test("a failed request shows the error state", async () => {
    renderSuggestion({
      suggestionDeps: {
        fetchAdviceFn: vi
          .fn()
          .mockResolvedValue({ ok: false, code: "model_error" }),
      },
    });
    await userEvent.click(screen.getByTestId("blind-suggest"));
    await expect(
      screen.findByTestId("suggestion-error"),
    ).resolves.toBeInTheDocument();
  });
});
