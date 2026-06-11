import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { HandOption } from "../../ai/getHandOptions";
import type { MoveExplanationState } from "../../ai/advisor/useMoveExplanation";
import AutopilotControls from "./AutopilotControls";

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

function renderControls(
  overrides: {
    proposal?: HandOption | null;
    modelProgress?: { loaded: number; total: number | null } | null;
    explanation?: MoveExplanationState;
    onApprove?: () => void;
    onStop?: () => void;
    onExplain?: () => void;
  } = {},
) {
  return render(
    <AutopilotControls
      proposal={"proposal" in overrides ? (overrides.proposal ?? null) : playProposal()}
      modelProgress={overrides.modelProgress ?? null}
      explanation={overrides.explanation ?? { phase: "idle" }}
      onApprove={overrides.onApprove ?? vi.fn()}
      onStop={overrides.onStop ?? vi.fn()}
      onExplain={overrides.onExplain ?? vi.fn()}
    />,
  );
}

describe("AutopilotControls", () => {
  test("describes a play proposal with its hand label", () => {
    renderControls({ proposal: playProposal() });
    expect(screen.getByText(/Autopilot suggests playing/)).toBeInTheDocument();
  });

  test("describes a discard proposal", () => {
    renderControls({ proposal: discardProposal() });
    expect(
      screen.getByText(/Autopilot suggests discarding/),
    ).toBeInTheDocument();
  });

  test("the approve button invokes onApprove", async () => {
    const onApprove = vi.fn();
    const user = userEvent.setup();
    renderControls({ onApprove });
    await user.click(screen.getByRole("button", { name: /Approve move/ }));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  test("the stop button invokes onStop", async () => {
    const onStop = vi.fn();
    const user = userEvent.setup();
    renderControls({ onStop });
    await user.click(screen.getByRole("button", { name: /Stop autopilot/ }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  test("shows a download progress bar while the model loads", () => {
    renderControls({ proposal: null, modelProgress: { loaded: 64, total: 128 } });
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "64");
  });

  test("does not offer approve while the model is downloading", () => {
    renderControls({ proposal: null, modelProgress: { loaded: 0, total: null } });
    expect(
      screen.queryByRole("button", { name: /Approve move/ }),
    ).not.toBeInTheDocument();
  });

  test("stop is available while the model is downloading", async () => {
    const onStop = vi.fn();
    const user = userEvent.setup();
    renderControls({
      proposal: null,
      modelProgress: { loaded: 0, total: null },
      onStop,
    });
    await user.click(screen.getByRole("button", { name: /Stop autopilot/ }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  test("the explain button invokes onExplain", async () => {
    const onExplain = vi.fn();
    const user = userEvent.setup();
    renderControls({ onExplain });
    await user.click(screen.getByRole("button", { name: /Explain this move/ }));
    expect(onExplain).toHaveBeenCalledTimes(1);
  });

  test("does not offer explain while the model is downloading", () => {
    renderControls({ proposal: null, modelProgress: { loaded: 0, total: null } });
    expect(
      screen.queryByRole("button", { name: /Explain this move/ }),
    ).not.toBeInTheDocument();
  });

  test("disables the explain button while the explanation loads", () => {
    renderControls({ explanation: { phase: "loading" } });
    expect(
      screen.getByRole("button", { name: /Explain this move/ }),
    ).toBeDisabled();
  });

  test("renders the explanation text when ready", () => {
    renderControls({
      explanation: {
        phase: "ready",
        explanation: "Play the pair to bank chips.",
        concept: "Lock in value.",
      },
    });
    expect(
      screen.getByText("Play the pair to bank chips."),
    ).toBeInTheDocument();
  });

  test("renders an error message when the explanation fails", () => {
    renderControls({ explanation: { phase: "error", code: "model_timeout" } });
    expect(
      screen.getByText(/couldn't explain this move/),
    ).toBeInTheDocument();
  });
});
