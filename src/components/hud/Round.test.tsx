import { render, screen } from "@testing-library/react";
import Round from "./Round";
import type { BlindValuesMap } from "../../cards/types";
import type { BossBlind } from "../../items/bosses";

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

describe("Round — Boss Blind name (#245 phase 0)", () => {
  const wall: BossBlind = {
    id: "the-wall",
    name: "The Wall",
    description: "Extra large blind requirement.",
    scoreMultiplier: 4,
    anteMin: 2,
    effect: { kind: "none" },
  };

  test("renders the boss name on blind 3 instead of the default label", () => {
    render(
      <Round
        blind={3}
        BlindValues={BlindValues}
        roundScore={0}
        requiredScore={1200}
        boss={wall}
      />,
    );
    expect(screen.getByText("The Wall")).toBeInTheDocument();
  });

  test("renders the boss description as visible text below the name on blind 3", () => {
    render(
      <Round
        blind={3}
        BlindValues={BlindValues}
        roundScore={0}
        requiredScore={1200}
        boss={wall}
      />,
    );
    expect(screen.getByText("Extra large blind requirement.")).toBeInTheDocument();
  });

  test("does not render the boss description on blind 1", () => {
    render(
      <Round
        blind={1}
        BlindValues={BlindValues}
        roundScore={0}
        requiredScore={300}
        boss={wall}
      />,
    );
    expect(
      screen.queryByText("Extra large blind requirement."),
    ).not.toBeInTheDocument();
  });

  test("does not render the boss description on blind 2", () => {
    render(
      <Round
        blind={2}
        BlindValues={BlindValues}
        roundScore={0}
        requiredScore={450}
        boss={wall}
      />,
    );
    expect(
      screen.queryByText("Extra large blind requirement."),
    ).not.toBeInTheDocument();
  });

  test("does not render a boss description when boss is null", () => {
    const { container } = render(
      <Round
        blind={3}
        BlindValues={BlindValues}
        roundScore={0}
        requiredScore={600}
        boss={null}
      />,
    );
    expect(container.querySelector(".boss-effect")).toBeNull();
  });

  test("does not render the boss name on blind 1", () => {
    render(
      <Round
        blind={1}
        BlindValues={BlindValues}
        roundScore={0}
        requiredScore={300}
        boss={wall}
      />,
    );
    expect(screen.queryByText("The Wall")).not.toBeInTheDocument();
    expect(screen.getByText("Small Blind")).toBeInTheDocument();
  });

  test("does not render the boss name on blind 2", () => {
    render(
      <Round
        blind={2}
        BlindValues={BlindValues}
        roundScore={0}
        requiredScore={450}
        boss={wall}
      />,
    );
    expect(screen.queryByText("The Wall")).not.toBeInTheDocument();
    expect(screen.getByText("Big Blind")).toBeInTheDocument();
  });

  test("falls back to BlindValues[3] when boss prop is null", () => {
    render(
      <Round
        blind={3}
        BlindValues={BlindValues}
        roundScore={0}
        requiredScore={600}
        boss={null}
      />,
    );
    expect(screen.getByText("Boss Blind")).toBeInTheDocument();
  });
});

describe("Round — The Mouth locked-hand indicator (#631)", () => {
  const mouth: BossBlind = {
    id: "the-mouth",
    name: "The Mouth",
    description: "Only one hand type can be played this round.",
    scoreMultiplier: 2,
    anteMin: 2,
    effect: { kind: "single-hand-type" },
  };

  const wall: BossBlind = {
    id: "the-wall",
    name: "The Wall",
    description: "Extra large blind requirement.",
    scoreMultiplier: 4,
    anteMin: 2,
    effect: { kind: "none" },
  };

  test("renders the locked hand label when first hand has been played", () => {
    render(
      <Round
        blind={3}
        BlindValues={BlindValues}
        roundScore={0}
        requiredScore={600}
        boss={mouth}
        firstPlayedHandLabel="Pair"
      />,
    );
    expect(screen.getByTestId("boss-locked-hand")).toHaveTextContent(
      /Locked to:\s*Pair/,
    );
  });

  test("does not render the locked indicator before any hand is played", () => {
    render(
      <Round
        blind={3}
        BlindValues={BlindValues}
        roundScore={0}
        requiredScore={600}
        boss={mouth}
        firstPlayedHandLabel={null}
      />,
    );
    expect(screen.queryByTestId("boss-locked-hand")).not.toBeInTheDocument();
  });

  test("does not render the locked indicator when boss is not The Mouth", () => {
    render(
      <Round
        blind={3}
        BlindValues={BlindValues}
        roundScore={0}
        requiredScore={600}
        boss={wall}
        firstPlayedHandLabel="Pair"
      />,
    );
    expect(screen.queryByTestId("boss-locked-hand")).not.toBeInTheDocument();
  });

  test("does not render the locked indicator on a non-boss blind", () => {
    render(
      <Round
        blind={1}
        BlindValues={BlindValues}
        roundScore={0}
        requiredScore={300}
        boss={mouth}
        firstPlayedHandLabel="Pair"
      />,
    );
    expect(screen.queryByTestId("boss-locked-hand")).not.toBeInTheDocument();
  });

  test("uses an aria-label that names the locked hand for screen readers", () => {
    render(
      <Round
        blind={3}
        BlindValues={BlindValues}
        roundScore={0}
        requiredScore={600}
        boss={mouth}
        firstPlayedHandLabel="Flush"
      />,
    );
    expect(screen.getByLabelText("Locked to Flush")).toBeInTheDocument();
  });
});
