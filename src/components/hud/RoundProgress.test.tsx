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
