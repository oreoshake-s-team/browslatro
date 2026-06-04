import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import NewRunScreen from "./NewRunScreen";

describe("NewRunScreen", () => {
  test("renders one button per implemented stake", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  test("does not render unimplemented stakes like Gold (negative)", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    expect(screen.queryByTestId("new-run-stake-gold")).not.toBeInTheDocument();
  });

  test("renders the Red stake tile (implemented)", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    expect(screen.getByTestId("new-run-stake-red")).toBeInTheDocument();
  });

  test("initial stake defaults to White", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    expect(screen.getByTestId("new-run-stake-white")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("respects an initialStake override", () => {
    render(<NewRunScreen initialStake="red" onConfirm={vi.fn()} />);
    expect(screen.getByTestId("new-run-stake-red")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("clicking a stake tile selects it (visual + aria)", async () => {
    const user = userEvent.setup();
    render(<NewRunScreen onConfirm={vi.fn()} />);
    await user.click(screen.getByTestId("new-run-stake-red"));
    expect(screen.getByTestId("new-run-stake-red")).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  test("the description region updates to the selected stake", async () => {
    const user = userEvent.setup();
    render(<NewRunScreen onConfirm={vi.fn()} />);
    await user.click(screen.getByTestId("new-run-stake-red"));
    expect(screen.getByTestId("new-run-stake-description")).toHaveTextContent(
      "Red Stake",
    );
  });

  test("Start Run fires onConfirm with the selected stake", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<NewRunScreen onConfirm={onConfirm} />);
    await user.click(screen.getByTestId("new-run-stake-red"));
    await user.click(screen.getByTestId("new-run-confirm"));
    expect(onConfirm).toHaveBeenCalledWith({ stake: "red" });
  });

  test("Start Run defaults to the initial stake when nothing is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<NewRunScreen onConfirm={onConfirm} />);
    await user.click(screen.getByTestId("new-run-confirm"));
    expect(onConfirm).toHaveBeenCalledWith({ stake: "white" });
  });

  test("shows the deck slot as a placeholder for the #561 follow-up (negative)", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    expect(screen.getByText(/Deck selection coming soon/i)).toBeInTheDocument();
  });

  test("does not render the dialog content twice (negative)", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  test("keyboard radio role marks the active tile as checked exactly once", async () => {
    const user = userEvent.setup();
    render(<NewRunScreen onConfirm={vi.fn()} />);
    await user.click(screen.getByTestId("new-run-stake-red"));
    const checked = screen
      .getAllByRole("radio")
      .filter((r) => r.getAttribute("aria-checked") === "true");
    expect(checked).toHaveLength(1);
  });

  test("Start Run button is focusable for Enter-to-confirm (a11y)", () => {
    render(<NewRunScreen onConfirm={vi.fn()} />);
    fireEvent.focus(screen.getByTestId("new-run-confirm"));
    expect(screen.getByTestId("new-run-confirm")).toHaveFocus();
  });
});
