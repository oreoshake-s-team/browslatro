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
        modelProgress={null}
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
        modelProgress={null}
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
        modelProgress={null}
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
        modelProgress={null}
        onApprove={vi.fn()}
        onStop={onStop}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Stop autopilot/ }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  test("shows a download progress bar while the model loads", () => {
    render(
      <AutopilotControls
        proposal={null}
        modelProgress={{ loaded: 64, total: 128 }}
        onApprove={vi.fn()}
        onStop={vi.fn()}
      />,
    );
    expect(screen.getByRole("progressbar")).toHaveAttribute("value", "64");
  });

  test("does not offer approve while the model is downloading", () => {
    render(
      <AutopilotControls
        proposal={null}
        modelProgress={{ loaded: 0, total: null }}
        onApprove={vi.fn()}
        onStop={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Approve move/ }),
    ).not.toBeInTheDocument();
  });

  test("stop is available while the model is downloading", async () => {
    const onStop = vi.fn();
    const user = userEvent.setup();
    render(
      <AutopilotControls
        proposal={null}
        modelProgress={{ loaded: 0, total: null }}
        onApprove={vi.fn()}
        onStop={onStop}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Stop autopilot/ }));
    expect(onStop).toHaveBeenCalledTimes(1);
  });
});
