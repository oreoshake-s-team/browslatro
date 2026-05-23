import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Options from "./Options";

describe("Options", () => {
  test("button opens modal", () => {
    render(<Options onReset={() => {}} />);
    expect(screen.queryByRole("heading", { name: "Options" })).not.toBeInTheDocument();
    userEvent.click(screen.getByText("Options"));
    expect(screen.getByRole("heading", { name: "Options" })).toBeInTheDocument();
  });

  test("Close button dismisses modal", () => {
    render(<Options onReset={() => {}} />);
    userEvent.click(screen.getByText("Options"));
    userEvent.click(screen.getByText("Close"));
    expect(screen.queryByRole("heading", { name: "Options" })).not.toBeInTheDocument();
  });

  test("clicking overlay dismisses modal", () => {
    render(<Options onReset={() => {}} />);
    userEvent.click(screen.getByText("Options"));
    userEvent.click(document.querySelector(".modal-overlay") as HTMLElement);
    expect(screen.queryByRole("heading", { name: "Options" })).not.toBeInTheDocument();
  });

  test("Reset button calls onReset and closes modal", () => {
    const onReset = jest.fn();
    render(<Options onReset={onReset} />);
    userEvent.click(screen.getByText("Options"));
    userEvent.click(screen.getByText("Reset"));
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("heading", { name: "Options" })).not.toBeInTheDocument();
  });
});