import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { HandOption } from "../../ai/getHandOptions";
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

describe("AutopilotControls", () => {
  test("describes a play proposal with its hand label", () => {
    render(
      <AutopilotControls
        proposal={playProposal()}
        onApprove={vi.fn()}
        onStop={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/Autopilot suggests playing/),
    ).toBeInTheDocument();
  });

  test("describes a discard proposal", () => {
    render(
      <AutopilotControls
        proposal={discardProposal()}
        onApprove={vi.fn()}
        onStop={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/Autopilot suggests discarding/),
    ).toBeInTheDocument();
  });

  test("the approve button invokes onApprove", async () => {
    const onApprove = vi.fn();
    const user = userEvent.setup();
    render(
      <AutopilotControls
        proposal={playProposal()}
        onApprove={onApprove}
        onStop={vi.fn()}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Approve move/ }));
    expect(onApprove).toHaveBeenCalledTimes(1);
  });

  test("the stop button invokes onStop", async () => {
    const onStop = vi.fn();
    const user = userEvent.setup();
    render(
      <AutopilotControls
        proposal={playProposal()}
        onApprove={vi.fn()}
        onStop={onStop}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Stop autopilot/ }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
