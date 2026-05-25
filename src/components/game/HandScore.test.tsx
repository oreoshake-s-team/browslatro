import { render, screen } from "@testing-library/react";
import HandScore from "./HandScore";
import { HANDS } from "../../constants";

describe("HandScore empty state", () => {
  test("does not render a hand label when selectedHand is null", () => {
    render(<HandScore chips={0} multiplier={0} selectedHand={null} />);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  test("renders chips as 0 when empty", () => {
    const { container } = render(
      <HandScore chips={0} multiplier={0} selectedHand={null} />,
    );
    expect(container.querySelector(".chips")).toHaveTextContent("0");
  });

  test("renders multiplier as 0 when empty", () => {
    const { container } = render(
      <HandScore chips={0} multiplier={0} selectedHand={null} />,
    );
    expect(container.querySelector(".multiplier")).toHaveTextContent("0");
  });
});

describe("HandScore populated state", () => {
  test("renders the hand label when selectedHand is provided", () => {
    render(
      <HandScore chips={20} multiplier={2} selectedHand={HANDS[2]} />,
    );
    expect(
      screen.getByRole("heading", { name: HANDS[2].label }),
    ).toBeInTheDocument();
  });

  test("renders the live chips value when selectedHand is provided", () => {
    const { container } = render(
      <HandScore chips={42} multiplier={2} selectedHand={HANDS[0]} />,
    );
    expect(container.querySelector(".chips")).toHaveTextContent("42");
  });

  test("renders the live multiplier value when selectedHand is provided", () => {
    const { container } = render(
      <HandScore chips={10} multiplier={7} selectedHand={HANDS[0]} />,
    );
    expect(container.querySelector(".multiplier")).toHaveTextContent("7");
  });
});
