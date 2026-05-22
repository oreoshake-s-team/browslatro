import { render, screen } from "@testing-library/react";
import RunProgress from "./RunProgress";

function getStatValue(label) {
  return screen.getByText(label).parentElement;
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