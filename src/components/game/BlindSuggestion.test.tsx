import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Advice } from "../../ai/advisor/advice";
import { storePlayerKey } from "../../ai/advisor/playerKey";
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

// Early ante + a strong tag → the coach recommends Skip (you can coast).
function renderSuggestion(
  overrides: Partial<BlindSuggestionProps> = {},
  advice: Advice = adviceFixture(),
) {
  const props: BlindSuggestionProps = {
    ante: 1,
    currentBlind: 1,
    boss: createBossCatalog()[0],
    stake: "white",
    skipRewards: { small: { id: "rare" }, big: { id: "rare" } },
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

// A late ante with no build can't coast → the coach recommends Play.
function renderPlayCase(overrides: Partial<BlindSuggestionProps> = {}) {
  return renderSuggestion({ ante: 6, ...overrides });
}

async function revealCoachPick(): Promise<void> {
  await userEvent.click(screen.getByTestId("coach-trigger"));
}

describe("BlindSuggestion click-to-reveal", () => {
  test("shows a Coach tip trigger, not the panel, by default", () => {
    renderSuggestion();
    expect(screen.getByTestId("coach-trigger")).toBeInTheDocument();
  });

  test("the coach panel is not shown until the trigger is clicked", () => {
    renderSuggestion();
    expect(screen.queryByTestId("coach-advice")).not.toBeInTheDocument();
  });

  test("recommends skipping a winnable early blind for a strong tag", async () => {
    renderSuggestion();
    await revealCoachPick();
    await expect(
      screen.findByTestId("coach-recommendation"),
    ).resolves.toHaveTextContent(/^Skip it for the /);
  });

  test("recommends playing when the build cannot coast", async () => {
    renderPlayCase();
    await revealCoachPick();
    await expect(
      screen.findByTestId("coach-recommendation"),
    ).resolves.toHaveTextContent(/^Play the blind /);
  });

  test("recommends playing a strong tag is not enough without a build", async () => {
    renderSuggestion({ ante: 4, skipRewards: { small: { id: "handy" } } });
    await revealCoachPick();
    await expect(
      screen.findByTestId("coach-recommendation"),
    ).resolves.toHaveTextContent(/^Play the blind /);
  });

  test("revealing the coach does not call the LLM", async () => {
    const props = renderSuggestion();
    await revealCoachPick();
    await screen.findByTestId("coach-recommendation");
    expect(props.suggestionDeps?.fetchAdviceFn).not.toHaveBeenCalled();
  });

  test("applying a skip recommendation skips the blind", async () => {
    const props = renderSuggestion();
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("coach-apply"));
    expect(props.onSkip).toHaveBeenCalledOnce();
  });

  test("applying a play recommendation plays the blind", async () => {
    const props = renderPlayCase();
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("coach-apply"));
    expect(props.onPlay).toHaveBeenCalledOnce();
  });

  test("the apply button reads Skip for the tag on a skip pick", async () => {
    renderSuggestion();
    await revealCoachPick();
    await expect(screen.findByTestId("coach-apply")).resolves.toHaveTextContent(
      "Skip for the tag",
    );
  });

  test("the apply button reads Play the blind on a play pick", async () => {
    renderPlayCase();
    await revealCoachPick();
    await expect(screen.findByTestId("coach-apply")).resolves.toHaveTextContent(
      "Play the blind",
    );
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

  test("asking the AI posts a blind-context request", async () => {
    const fetchAdviceFn = vi
      .fn()
      .mockResolvedValue({ ok: true, advice: adviceFixture() });
    renderSuggestion({ suggestionDeps: { fetchAdviceFn } });
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("coach-ask-ai"));
    await screen.findByTestId("coach-ai-verdict");
    expect(fetchAdviceFn).toHaveBeenCalledWith(
      expect.objectContaining({ context: "blind" }),
    );
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

  test("an applied skip is not logged as human play, while a manual skip after it is", async () => {
    const recordSkip = (): boolean =>
      captureRunEvent(useGame.getState(), { kind: "blind-skip", tag: null });
    renderSuggestion({
      onSkip: () => {
        recordSkip();
      },
    });
    await revealCoachPick();
    await userEvent.click(await screen.findByTestId("coach-apply"));
    expect(humanPlayLog().count()).toBe(0);
    recordSkip();
    expect(humanPlayLog().counts()).toEqual({ "blind-skip": 1 });
  });
});
