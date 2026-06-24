import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import AdviceFeedbackControl from "./AdviceFeedbackControl";

const LABELS = ["Play Pair", "Discard two cards", "Reroll"];

function renderControl(onSubmit: (i: number | null) => void = vi.fn()) {
  return render(
    <AdviceFeedbackControl candidateLabels={LABELS} onSubmit={onSubmit} />,
  );
}

describe("AdviceFeedbackControl", () => {
  test("renders the bad-pick affordance initially", () => {
    renderControl();
    expect(screen.getByTestId("advice-feedback-open")).toBeInTheDocument();
  });

  test("the affordance is collapsed by default", () => {
    renderControl();
    expect(screen.getByTestId("advice-feedback-open")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  test("does not render the corrective picker until opened (negative)", () => {
    renderControl();
    expect(
      screen.queryByText("Which would you pick instead?"),
    ).not.toBeInTheDocument();
  });

  test("opening reveals the corrective prompt", async () => {
    const user = userEvent.setup();
    renderControl();
    await user.click(screen.getByTestId("advice-feedback-open"));
    expect(
      screen.getByText("Which would you pick instead?"),
    ).toBeInTheDocument();
  });

  test("renders a radio for each candidate when opened", async () => {
    const user = userEvent.setup();
    renderControl();
    await user.click(screen.getByTestId("advice-feedback-open"));
    expect(screen.getAllByRole("radio")).toHaveLength(LABELS.length);
  });

  test("submit is disabled until a candidate is chosen", async () => {
    const user = userEvent.setup();
    renderControl();
    await user.click(screen.getByTestId("advice-feedback-open"));
    expect(screen.getByTestId("advice-feedback-submit")).toBeDisabled();
  });

  test("submitting a corrective pick reports the chosen index", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderControl(onSubmit);
    await user.click(screen.getByTestId("advice-feedback-open"));
    await user.click(screen.getByTestId("advice-feedback-option-2"));
    await user.click(screen.getByTestId("advice-feedback-submit"));
    expect(onSubmit).toHaveBeenCalledWith(2);
  });

  test("uses a custom submit label when provided", async () => {
    const user = userEvent.setup();
    render(
      <AdviceFeedbackControl
        candidateLabels={LABELS}
        onSubmit={vi.fn()}
        submitLabel="Play this instead"
      />,
    );
    await user.click(screen.getByTestId("advice-feedback-open"));
    expect(screen.getByTestId("advice-feedback-submit")).toHaveTextContent(
      "Play this instead",
    );
  });

  test("defaults the submit label to Submit (negative)", async () => {
    const user = userEvent.setup();
    renderControl();
    await user.click(screen.getByTestId("advice-feedback-open"));
    expect(screen.getByTestId("advice-feedback-submit")).toHaveTextContent(
      "Submit",
    );
  });

  test("a bare downvote reports a null corrected index", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderControl(onSubmit);
    await user.click(screen.getByTestId("advice-feedback-open"));
    await user.click(screen.getByTestId("advice-feedback-just-bad"));
    expect(onSubmit).toHaveBeenCalledWith(null);
  });

  test("shows a recorded confirmation after submitting", async () => {
    const user = userEvent.setup();
    renderControl();
    await user.click(screen.getByTestId("advice-feedback-open"));
    await user.click(screen.getByTestId("advice-feedback-just-bad"));
    expect(screen.getByTestId("advice-feedback-recorded")).toBeInTheDocument();
  });

  test("the confirmation is a live status region", async () => {
    const user = userEvent.setup();
    renderControl();
    await user.click(screen.getByTestId("advice-feedback-open"));
    await user.click(screen.getByTestId("advice-feedback-just-bad"));
    expect(screen.getByTestId("advice-feedback-recorded")).toHaveAttribute(
      "role",
      "status",
    );
  });

  test("cancelling collapses back to the affordance without recording", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderControl(onSubmit);
    await user.click(screen.getByTestId("advice-feedback-open"));
    await user.click(screen.getByTestId("advice-feedback-cancel"));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("cancelling restores the bad-pick affordance", async () => {
    const user = userEvent.setup();
    renderControl();
    await user.click(screen.getByTestId("advice-feedback-open"));
    await user.click(screen.getByTestId("advice-feedback-cancel"));
    expect(screen.getByTestId("advice-feedback-open")).toBeInTheDocument();
  });

  test("choosing a candidate previews its index before submitting", async () => {
    const onPreview = vi.fn();
    const user = userEvent.setup();
    render(
      <AdviceFeedbackControl
        candidateLabels={LABELS}
        onSubmit={vi.fn()}
        onPreview={onPreview}
      />,
    );
    await user.click(screen.getByTestId("advice-feedback-open"));
    await user.click(screen.getByTestId("advice-feedback-option-1"));
    expect(onPreview).toHaveBeenCalledWith(1);
  });

  test("does not preview before a candidate is chosen (negative)", async () => {
    const onPreview = vi.fn();
    const user = userEvent.setup();
    render(
      <AdviceFeedbackControl
        candidateLabels={LABELS}
        onSubmit={vi.fn()}
        onPreview={onPreview}
      />,
    );
    await user.click(screen.getByTestId("advice-feedback-open"));
    expect(onPreview).not.toHaveBeenCalled();
  });
});
