import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { HandOption } from "../../ai/getHandOptions";
import type { MoveExplanationState } from "../../ai/advisor/useMoveExplanation";
import { readStoredPlayerKey } from "../../ai/advisor/playerKey";
import { useGame } from "../../store/game";
import AutopilotControls from "./AutopilotControls";

beforeEach(() => {
  window.localStorage.clear();
  useGame.getState().resetGame();
});

afterEach(() => {
  Reflect.deleteProperty(window, "matchMedia");
});

function mockReducedMotion(reduce: boolean): void {
  window.matchMedia = vi.fn().mockReturnValue({
    matches: reduce,
    media: "(prefers-reduced-motion: reduce)",
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }) as unknown as typeof window.matchMedia;
}

function playProposal(): HandOption {
  return {
    action: "play",
    cardIds: [1, 2],
    handLabel: "Pair",
    score: 40,
    chips: 20,
    mult: 2,
    notes: [],
  };
}

function discardProposal(): HandOption {
  return { action: "discard", cardIds: [3, 4], notes: [] };
}

function readyExplanation(
  advice?: Partial<{
    recommendationIndex: number;
    alternativeIndex: number;
    whyAlternativeWorse: string;
    explanation: string;
    concept: string;
  }>,
): MoveExplanationState {
  return {
    phase: "ready",
    candidates: [playProposal(), discardProposal()],
    advice: {
      recommendationIndex: 0,
      alternativeIndex: 1,
      whyAlternativeWorse: "Discarding wastes the pair.",
      explanation: "Play the pair to bank chips.",
      concept: "Lock in value.",
      ...advice,
    },
  };
}

function renderControls(
  overrides: {
    proposal?: HandOption | null;
    modelProgress?: { loaded: number; total: number | null } | null;
    proposalUnavailable?: boolean;
    explanation?: MoveExplanationState;
    feedbackCandidates?: ReadonlyArray<HandOption> | null;
    feedbackRecorded?: boolean;
    onApprove?: () => void;
    onAskAi?: () => void;
    onRetry?: () => void;
    onFeedback?: (correctedIndex: number | null) => void;
  } = {},
) {
  return render(
    <AutopilotControls
      proposal={"proposal" in overrides ? (overrides.proposal ?? null) : playProposal()}
      modelProgress={overrides.modelProgress ?? null}
      proposalUnavailable={overrides.proposalUnavailable ?? false}
      explanation={overrides.explanation ?? { phase: "idle" }}
      feedbackCandidates={overrides.feedbackCandidates ?? null}
      feedbackRecorded={overrides.feedbackRecorded ?? false}
      onApprove={overrides.onApprove ?? vi.fn()}
      onAskAi={overrides.onAskAi ?? vi.fn()}
      onRetry={overrides.onRetry ?? vi.fn()}
      onFeedback={overrides.onFeedback}
    />,
  );
}

describe("AutopilotControls", () => {
  test("labels the panel as a suggested move", () => {
    renderControls({ proposal: playProposal() });
    expect(screen.getByText(/Suggested move/)).toBeInTheDocument();
  });

  test("announces when no suggestion is available", () => {
    renderControls({ proposal: null, proposalUnavailable: true });
    expect(screen.getByTestId("autopilot-no-suggestion")).toHaveTextContent(
      "No suggestion available",
    );
  });

  test("does not announce unavailability while a proposal exists", () => {
    renderControls({ proposal: playProposal(), proposalUnavailable: true });
    expect(screen.queryByTestId("autopilot-no-suggestion")).not.toBeInTheDocument();
  });

  test("describes a play proposal with its hand label", () => {
    renderControls({ proposal: playProposal() });
    expect(screen.getByText(/Play Pair/)).toBeInTheDocument();
  });

  test("describes a discard proposal", () => {
    renderControls({ proposal: discardProposal() });
    expect(
      screen.getByText(/Discard the selected cards/),
    ).toBeInTheDocument();
  });

  test("the approve button invokes onApprove", async () => {
    const onApprove = vi.fn();
    const user = userEvent.setup();
    renderControls({ onApprove });
    await user.click(screen.getByRole("button", { name: /Approve move/ }));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  test("no longer renders a stop button (removed from the flow)", () => {
    renderControls({ proposal: playProposal() });
    expect(
      screen.queryByRole("button", { name: /Stop suggesting/ }),
    ).not.toBeInTheDocument();
  });

  test("shows a determinate download progress bar while the model loads", () => {
    renderControls({ proposal: null, modelProgress: { loaded: 64, total: 128 } });
    expect(screen.getByRole("progressbar")).toHaveAttribute("max", "1");
  });

  test("reflects real download progress when motion is reduced", () => {
    mockReducedMotion(true);
    renderControls({ proposal: null, modelProgress: { loaded: 64, total: 128 } });
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0.45");
  });

  test("parks near the ceiling for an indeterminate load when motion is reduced", () => {
    mockReducedMotion(true);
    renderControls({ proposal: null, modelProgress: { loaded: 0, total: null } });
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0.9");
  });

  test("does not render the progress bar once the model is loaded (negative)", () => {
    renderControls({ proposal: playProposal(), modelProgress: null });
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  test("does not offer approve while the model is downloading", () => {
    renderControls({ proposal: null, modelProgress: { loaded: 0, total: null } });
    expect(
      screen.queryByRole("button", { name: /Approve move/ }),
    ).not.toBeInTheDocument();
  });

  test("shows the bad-pick affordance when policy feedback candidates are provided", () => {
    renderControls({
      proposal: playProposal(),
      feedbackCandidates: [playProposal(), discardProposal()],
      onFeedback: vi.fn(),
    });
    expect(screen.getByTestId("advice-feedback-open")).toBeInTheDocument();
  });

  test("omits the bad-pick affordance without feedback candidates (negative)", () => {
    renderControls({ proposal: playProposal(), onFeedback: vi.fn() });
    expect(screen.queryByTestId("advice-feedback-open")).not.toBeInTheDocument();
  });

  test("a corrective pick reports the chosen candidate index", async () => {
    const onFeedback = vi.fn();
    const user = userEvent.setup();
    renderControls({
      proposal: playProposal(),
      feedbackCandidates: [playProposal(), discardProposal()],
      onFeedback,
    });
    await user.click(screen.getByTestId("advice-feedback-open"));
    await user.click(screen.getByTestId("advice-feedback-option-1"));
    await user.click(screen.getByTestId("advice-feedback-submit"));
    expect(onFeedback).toHaveBeenCalledWith(1);
  });

  test("a bare downvote reports a null corrected index", async () => {
    const onFeedback = vi.fn();
    const user = userEvent.setup();
    renderControls({
      proposal: playProposal(),
      feedbackCandidates: [playProposal(), discardProposal()],
      onFeedback,
    });
    await user.click(screen.getByTestId("advice-feedback-open"));
    await user.click(screen.getByTestId("advice-feedback-just-bad"));
    expect(onFeedback).toHaveBeenCalledWith(null);
  });

  test("announces the recorded confirmation after feedback (proposal dismissed)", () => {
    renderControls({ proposal: null, feedbackRecorded: true });
    expect(screen.getByText(/your feedback was recorded/i)).toBeInTheDocument();
  });


  test("renders the explanation text when ready", () => {
    renderControls({ explanation: readyExplanation() });
    expect(
      screen.getByText("Play the pair to bank chips."),
    ).toBeInTheDocument();
  });

  test("labels the recommended move when ready", () => {
    renderControls({ explanation: readyExplanation() });
    expect(screen.getByText("Recommended move")).toBeInTheDocument();
  });

  test("shows the tempting alternative when it differs from the recommendation", () => {
    renderControls({ explanation: readyExplanation() });
    expect(
      screen.getByText("Discarding wastes the pair."),
    ).toBeInTheDocument();
  });

  test("hides the alternative when it matches the recommendation", () => {
    renderControls({
      explanation: readyExplanation({ alternativeIndex: 0 }),
    });
    expect(screen.queryByText("Tempting alternative")).not.toBeInTheDocument();
  });

  test("renders the transferable concept when ready", () => {
    renderControls({ explanation: readyExplanation() });
    expect(screen.getByText("Lock in value.")).toBeInTheDocument();
  });

  test("renders an error message when the explanation fails", () => {
    renderControls({ explanation: { phase: "error", code: "model_timeout" } });
    expect(
      screen.getByText(/couldn't explain this move/),
    ).toBeInTheDocument();
  });

  test("shows a wait-time message when rate-limited", () => {
    renderControls({
      explanation: {
        phase: "error",
        code: "rate_limited",
        retryAfterSeconds: 120,
      },
    });
    expect(screen.getByText(/about 2 min/)).toBeInTheDocument();
  });

  test("shows the no-eta limit message when there is no retry-after", () => {
    renderControls({
      explanation: { phase: "error", code: "rate_limited" },
    });
    expect(
      screen.getByText(/Free explanations are used up for now/),
    ).toBeInTheDocument();
  });

  test("offers an inline key form when rate-limited without a stored key", () => {
    renderControls({
      explanation: { phase: "error", code: "rate_limited" },
    });
    expect(screen.getByTestId("player-key-input")).toBeInTheDocument();
  });

  test("hides the key form when rate-limited but a key is already stored", () => {
    window.localStorage.setItem(
      "browslatro:advisor-player-key",
      "sk-ant-stored",
    );
    renderControls({
      explanation: { phase: "error", code: "rate_limited" },
    });
    expect(screen.queryByTestId("player-key-input")).not.toBeInTheDocument();
  });

  test("shows a key-rejected message when the player key is invalid", () => {
    renderControls({
      explanation: { phase: "error", code: "invalid_player_key" },
    });
    expect(screen.getByText(/key was rejected/)).toBeInTheDocument();
  });

  test("saving a key from the rescue form retries the last request", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    renderControls({
      explanation: { phase: "error", code: "invalid_player_key" },
      onRetry,
    });
    await user.type(screen.getByTestId("player-key-input"), "sk-ant-new");
    await user.click(screen.getByRole("button", { name: /Save key/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(readStoredPlayerKey()).toBe("sk-ant-new");
  });

  test("the ask-the-AI button invokes onAskAi", async () => {
    const onAskAi = vi.fn();
    const user = userEvent.setup();
    renderControls({ onAskAi });
    await user.click(screen.getByRole("button", { name: /Ask the AI/ }));
    expect(onAskAi).toHaveBeenCalledTimes(1);
  });

  test("does not offer ask-the-AI while the model is downloading", () => {
    renderControls({ proposal: null, modelProgress: { loaded: 0, total: null } });
    expect(
      screen.queryByRole("button", { name: /Ask the AI/ }),
    ).not.toBeInTheDocument();
  });

  test("disables the ask-the-AI button while a request is loading", () => {
    renderControls({ explanation: { phase: "loading" } });
    expect(
      screen.getByRole("button", { name: /Ask the AI/ }),
    ).toBeDisabled();
  });
});
