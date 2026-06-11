import { render, screen } from "@testing-library/react";
import RoundProgress from "./RoundProgress";

describe("RoundProgress", () => {
  test("displays remaining hands", () => {
    render(<RoundProgress remainingHands={4} remainingDiscards={3} />);
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  test("displays remaining discards", () => {
    render(<RoundProgress remainingHands={4} remainingDiscards={3} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});

describe("RoundProgress live regions", () => {
  test("hands stat is a polite live region", () => {
    render(<RoundProgress remainingHands={4} remainingDiscards={3} />);
    expect(screen.getByTestId("hands-stat")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  test("hands stat announces atomically", () => {
    render(<RoundProgress remainingHands={4} remainingDiscards={3} />);
    expect(screen.getByTestId("hands-stat")).toHaveAttribute(
      "aria-atomic",
      "true",
    );
  });

  test("hands stat announces the value with its translated label", () => {
    render(<RoundProgress remainingHands={4} remainingDiscards={3} />);
    expect(screen.getByTestId("hands-stat")).toHaveTextContent(/4\s*Hands/);
  });

  test("discards stat is a polite live region", () => {
    render(<RoundProgress remainingHands={4} remainingDiscards={3} />);
    expect(screen.getByTestId("discards-stat")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  test("discards stat announces atomically", () => {
    render(<RoundProgress remainingHands={4} remainingDiscards={3} />);
    expect(screen.getByTestId("discards-stat")).toHaveAttribute(
      "aria-atomic",
      "true",
    );
  });

  test("discards stat announces the value with its translated label", () => {
    render(<RoundProgress remainingHands={4} remainingDiscards={3} />);
    expect(screen.getByTestId("discards-stat")).toHaveTextContent(
      /3\s*Discards/,
    );
  });

  test("hands stat reflects an updated value after a hand is played", () => {
    const { rerender } = render(
      <RoundProgress remainingHands={4} remainingDiscards={3} />,
    );
    rerender(<RoundProgress remainingHands={3} remainingDiscards={3} />);
    expect(screen.getByTestId("hands-stat")).toHaveTextContent(/3\s*Hands/);
  });
});
