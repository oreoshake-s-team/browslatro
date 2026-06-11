import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type {
  ContextAdviceCandidate,
  SuggestionState,
} from "../../ai/advisor/useSuggestion";
import { storePlayerKey } from "../../ai/advisor/playerKey";
import SuggestionAdvice from "./SuggestionAdvice";

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

function readyState(
  advice?: Partial<{
    recommendationIndex: number;
    alternativeIndex: number;
  }>,
): SuggestionState<TestAction> {
  return {
    phase: "ready",
    advice: {
      recommendationIndex: 0,
      alternativeIndex: 2,
      whyAlternativeWorse: "Leaving banks nothing this ante.",
      explanation: "Jolly Joker scales every pair hand.",
      concept: "Buy engine pieces early.",
      ...advice,
    },
    candidates: candidates(),
    actions: [{ kind: "buy" }, { kind: "reroll" }, { kind: "leave" }],
  };
}

function renderAdvice(
  state: SuggestionState<TestAction>,
  handlers: Partial<{
    onApply: () => void;
    onDismiss: () => void;
    onRetry: () => void;
  }> = {},
) {
  return render(
    <SuggestionAdvice
      state={state}
      onApply={handlers.onApply ?? vi.fn()}
      onDismiss={handlers.onDismiss ?? vi.fn()}
      onRetry={handlers.onRetry ?? vi.fn()}
    />,
  );
}

describe("SuggestionAdvice", () => {
  test("renders nothing while idle", () => {
    const { container } = renderAdvice({ phase: "idle" });
    expect(container).toBeEmptyDOMElement();
  });

  test("announces the loading phase", () => {
    renderAdvice({ phase: "loading" });
    expect(screen.getByRole("status")).toHaveTextContent(
      "The coach is thinking",
    );
  });

  test("describes the recommended buy candidate", () => {
    renderAdvice(readyState());
    expect(screen.getByTestId("suggestion-recommendation")).toHaveTextContent(
      "Buy Jolly Joker for $3",
    );
  });

  test("describes the alternative candidate", () => {
    renderAdvice(readyState());
    expect(
      screen.getByText("Leave the shop and bank your money"),
    ).toBeInTheDocument();
  });

  test("describes a reroll recommendation with its cost", () => {
    renderAdvice(readyState({ recommendationIndex: 1 }));
    expect(screen.getByTestId("suggestion-recommendation")).toHaveTextContent(
      "Reroll the shop for $5",
    );
  });

  test("applies the suggestion on click", async () => {
    const onApply = vi.fn();
    renderAdvice(readyState(), { onApply });
    await userEvent.click(screen.getByTestId("suggestion-apply"));
    expect(onApply).toHaveBeenCalledOnce();
  });

  test("dismisses the suggestion on click", async () => {
    const onDismiss = vi.fn();
    renderAdvice(readyState(), { onDismiss });
    await userEvent.click(screen.getByTestId("suggestion-dismiss"));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  test("shows a retry button on a generic error", async () => {
    const onRetry = vi.fn();
    renderAdvice({ phase: "error", code: "model_error" }, { onRetry });
    await userEvent.click(screen.getByTestId("suggestion-retry"));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  test("shows the wait time when rate limited", () => {
    renderAdvice({
      phase: "error",
      code: "rate_limited",
      retryAfterSeconds: 600,
    });
    expect(screen.getByRole("status")).toHaveTextContent("10 min");
  });

  test("offers the key form to keyless players when rate limited", () => {
    renderAdvice({ phase: "error", code: "rate_limited" });
    expect(screen.getByLabelText("Your Anthropic API key")).toBeInTheDocument();
  });

  test("keeps the retry button instead of the key form for keyed players when rate limited", () => {
    storePlayerKey("sk-ant-test-1234");
    renderAdvice({ phase: "error", code: "rate_limited" });
    expect(screen.getByTestId("suggestion-retry")).toBeInTheDocument();
  });

  test("offers the key form when the player key is rejected", () => {
    storePlayerKey("sk-ant-test-1234");
    renderAdvice({ phase: "error", code: "invalid_player_key" });
    expect(screen.getByLabelText("Your Anthropic API key")).toBeInTheDocument();
  });
});
