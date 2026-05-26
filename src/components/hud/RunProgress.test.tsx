import { render, screen } from "@testing-library/react";
import RunProgress from "./RunProgress";

function getStatValue(label: string): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement;
}

describe("RunProgress", () => {
  test("displays ante, round, and money", () => {
    render(<RunProgress ante={3} round={7} money={42} />);
    expect(getStatValue("Ante")).toHaveTextContent("3");
    expect(getStatValue("Round")).toHaveTextContent("7");
    expect(getStatValue("Money")).toHaveTextContent("$42");
  });

  test("displays zero money as $0", () => {
    render(<RunProgress ante={1} round={1} money={0} />);
    expect(getStatValue("Money")).toHaveTextContent("$0");
  });
});

describe("RunProgress money bounce (#270)", () => {
  test("does not apply the bounce class on initial mount", () => {
    render(<RunProgress ante={1} round={1} money={4} />);
    expect(screen.getByTestId("money-value").className).not.toMatch(
      /money-bounce/,
    );
  });

  test("applies the bounce class after money changes", () => {
    const { rerender } = render(<RunProgress ante={1} round={1} money={4} />);
    rerender(<RunProgress ante={1} round={1} money={6} />);
    expect(screen.getByTestId("money-value").className).toMatch(/money-bounce/);
  });

  test("remounts the value node when money changes (key swap, fresh animation)", () => {
    const { rerender } = render(<RunProgress ante={1} round={1} money={4} />);
    const firstNode = screen.getByTestId("money-value");
    rerender(<RunProgress ante={1} round={1} money={6} />);
    const secondNode = screen.getByTestId("money-value");
    expect(secondNode).not.toBe(firstNode);
  });

  test("re-rendering with the same money keeps the same node (no double bounce)", () => {
    const { rerender } = render(<RunProgress ante={1} round={1} money={4} />);
    const firstNode = screen.getByTestId("money-value");
    rerender(<RunProgress ante={1} round={1} money={4} />);
    const secondNode = screen.getByTestId("money-value");
    expect(secondNode).toBe(firstNode);
  });

  test("bounces on money loss (4 → 2), not just gains", () => {
    const { rerender } = render(<RunProgress ante={1} round={1} money={4} />);
    rerender(<RunProgress ante={1} round={1} money={2} />);
    expect(screen.getByTestId("money-value").className).toMatch(/money-bounce/);
  });

  test("the Money stat is an aria-live polite region so changes are announced", () => {
    render(<RunProgress ante={1} round={1} money={4} />);
    const wrapper = screen.getByTestId("money-value").parentElement;
    expect(wrapper).toHaveAttribute("aria-live", "polite");
  });
});
