import { render, screen } from "@testing-library/react";
import Round from "./Round";

const blindValues = { 1: "Small Blind", 2: "Big Blind", 3: "Boss Blind" };

describe("Round", () => {
  test.each([
    [1, 1, "Small Blind", 300, "💲💲💲"],
    [2, 1, "Big Blind", 450, "💲💲💲💲"],
    [3, 1, "Boss Blind", 600, "💲💲💲💲💲"],
    [1, 2, "Small Blind", 800, "💲💲💲"],
    [1, 8, "Small Blind", 50000, "💲💲💲"],
  ])(
    "blind=%i ante=%i shows %s, score %i, award %s",
    (blind, ante, label, score, award) => {
      render(<Round blind={blind} ante={ante} blindValues={blindValues} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByText(`Score at least: ${score}`)).toBeInTheDocument();
      expect(screen.getByText(`to earn ${award}`)).toBeInTheDocument();
    }
  );
});