import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { AdviceClientErrorCode } from "../../ai/advisor/client";
import { storePlayerKey } from "../../ai/advisor/playerKey";
import type {
  ContextAdviceCandidate,
  SuggestionState,
} from "../../ai/advisor/useSuggestion";
import CoachAdvice from "./CoachAdvice";

type TestAction = { readonly kind: string };

beforeEach(() => {
  window.localStorage.clear();
});

function candidates(): ReadonlyArray<ContextAdviceCandidate> {
  return [
    {
      action: "buy",
      item: {
        itemType: "joker",
        id: "jolly-joker",
        name: "Jolly Joker",
        description: "+8 Mult if played hand contains a Pair",
        cost: 3,
      },
    },
    { action: "reroll", cost: 5 },
    { action: "leave" },
  ];
}

const actions: ReadonlyArray<TestAction> = [
  { kind: "buy" },
  { kind: "reroll" },
  { kind: "leave" },
];

function coachState(onnxIndex: number | null): SuggestionState<TestAction> {
  return { phase: "coach", onnxIndex, candidates: candidates(), actions };
}

function readyState(
  onnxIndex: number | null,
  recommendationIndex: number,
): SuggestionState<TestAction> {
  return {
    phase: "ready",
    onnxIndex,
    advice: {
      recommendationIndex,
      alternativeIndex: 2,
      whyAlternativeWorse: "Leaving banks nothing this ante.",
      explanation: "Jolly Joker scales every pair hand.",
      concept: "Buy engine pieces early.",
    },
    candidates: candidates(),
    actions,
  };
}

function errorState(code: AdviceClientErrorCode): SuggestionState<TestAction> {
  return { phase: "error", code, onnxIndex: 0, candidates: candidates(), actions };
}

function renderCoach(
  state: SuggestionState<TestAction>,
  handlers: Partial<{
    onApply: () => void;
    onAskAi: () => void;
    onDismiss: () => void;
    onFeedback: (correctedIndex: number | null) => void;
  }> = {},
) {
  render(
    <CoachAdvice
      state={state}
      onApply={handlers.onApply ?? vi.fn()}
      onAskAi={handlers.onAskAi ?? vi.fn()}
      onDismiss={handlers.onDismiss ?? vi.fn()}
      onFeedback={handlers.onFeedback}
    />,
  );
}

describe("CoachAdvice", () => {
  test("renders nothing while idle", () => {
    renderCoach({ phase: "idle" });
    expect(screen.queryByTestId("coach-advice")).not.toBeInTheDocument();
  });

  test("shows the coach pick from the onnx index", () => {
    renderCoach(coachState(1));
    expect(screen.getByTestId("coach-recommendation")).toHaveTextContent(
      "Reroll the shop for $5",
    );
  });

  test("shows a computing status before the onnx index resolves", () => {
    renderCoach(coachState(null));
    expect(screen.getByTestId("coach-advice")).toHaveTextContent("Coaching");
  });

  test("clicking apply invokes the apply handler", async () => {
    const onApply = vi.fn();
    renderCoach(coachState(0), { onApply });
    await userEvent.click(screen.getByTestId("coach-apply"));
    expect(onApply).toHaveBeenCalledOnce();
  });

  test("clicking ask AI invokes the ask handler", async () => {
    const onAskAi = vi.fn();
    renderCoach(coachState(0), { onAskAi });
    await userEvent.click(screen.getByTestId("coach-ask-ai"));
    expect(onAskAi).toHaveBeenCalledOnce();
  });

  test("clicking dismiss invokes the dismiss handler", async () => {
    const onDismiss = vi.fn();
    renderCoach(coachState(0), { onDismiss });
    await userEvent.click(screen.getByTestId("coach-dismiss"));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  test("the ask AI label warns about rate limits without a stored key", () => {
    renderCoach(coachState(0));
    expect(screen.getByTestId("coach-ask-ai")).toHaveTextContent("rate-limited");
  });

  test("the ask AI label omits the rate-limit warning with a stored key", () => {
    storePlayerKey("sk-ant-test-1234");
    renderCoach(coachState(0));
    expect(screen.getByTestId("coach-ask-ai")).not.toHaveTextContent(
      "rate-limited",
    );
  });

  test("the asking phase shows an AI thinking status", () => {
    renderCoach({ phase: "asking", onnxIndex: 0, candidates: candidates(), actions });
    expect(screen.getByTestId("coach-ai-thinking")).toBeInTheDocument();
  });

  test("a matching AI verdict reports agreement", () => {
    renderCoach(readyState(0, 0));
    expect(screen.getByTestId("coach-ai-verdict")).toHaveTextContent("AI agrees");
  });

  test("a differing AI verdict names the alternative move", () => {
    renderCoach(readyState(0, 1));
    expect(screen.getByTestId("coach-ai-verdict")).toHaveTextContent(
      "AI suggests Reroll the shop for $5 instead",
    );
  });

  test("an AI error keeps the coach pick visible", () => {
    renderCoach(errorState("model_error"));
    expect(screen.getByTestId("coach-recommendation")).toBeInTheDocument();
  });

  test("a rate-limit error offers the key form to keyless players", () => {
    renderCoach(errorState("rate_limited"));
    expect(screen.getByLabelText("Your Anthropic API key")).toBeInTheDocument();
  });

  test("shows the bad-pick affordance when onFeedback is provided", () => {
    renderCoach(coachState(0), { onFeedback: vi.fn() });
    expect(screen.getByTestId("advice-feedback-open")).toBeInTheDocument();
  });

  test("omits the bad-pick affordance without onFeedback (negative)", () => {
    renderCoach(coachState(0));
    expect(screen.queryByTestId("advice-feedback-open")).not.toBeInTheDocument();
  });

  test("a corrective pick reports the chosen candidate index", async () => {
    const onFeedback = vi.fn();
    renderCoach(coachState(0), { onFeedback });
    await userEvent.click(screen.getByTestId("advice-feedback-open"));
    await userEvent.click(screen.getByTestId("advice-feedback-option-1"));
    await userEvent.click(screen.getByTestId("advice-feedback-submit"));
    expect(onFeedback).toHaveBeenCalledWith(1);
  });

  test("a bare downvote reports a null corrected index", async () => {
    const onFeedback = vi.fn();
    renderCoach(coachState(0), { onFeedback });
    await userEvent.click(screen.getByTestId("advice-feedback-open"));
    await userEvent.click(screen.getByTestId("advice-feedback-just-bad"));
    expect(onFeedback).toHaveBeenCalledWith(null);
  });

  test("the downvote stays available after asking the AI", () => {
    renderCoach(readyState(0, 1), { onFeedback: vi.fn() });
    expect(screen.getByTestId("advice-feedback-open")).toBeInTheDocument();
  });
});
