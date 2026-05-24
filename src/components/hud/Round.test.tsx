import { render, screen } from "@testing-library/react";
import Round from "./Round";
import type { BlindValuesMap } from "../../types";

const BlindValues: BlindValuesMap = {
  1: "Small Blind",
  2: "Big Blind",
  3: "Boss Blind",
};

describe("Round", () => {
  test.each([
    [1, 1, "Small Blind", 300, "💲💲💲", 900],
    [2, 1, "Big Blind", 450, "💲💲💲💲", 800],
    [3, 1, "Boss Blind", 600, "💲💲💲💲💲", 1200],
    [1, 2, "Small Blind", 800, "💲💲💲", 1600],
    [1, 8, "Small Blind", 50000, "💲💲💲", 100000],
  ] as const)(
    "blind=%i ante=%i shows %s, score %i, award %s",
    (blind, _ante, label, score, award, roundScore) => {
      render(
        <Round
          blind={blind}
          BlindValues={BlindValues}
          roundScore={roundScore}
          requiredScore={score}
        />,
      );
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByText(`Score at least: ${score}`)).toBeInTheDocument();
      expect(screen.getByText(`to earn ${award}`)).toBeInTheDocument();
    },
  );
});
