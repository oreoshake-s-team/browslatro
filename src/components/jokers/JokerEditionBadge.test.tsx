import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import JokerEditionBadge from "./JokerEditionBadge";

describe("JokerEditionBadge", () => {
  test("a foil badge renders the Foil label", () => {
    render(<JokerEditionBadge edition="foil" />);
    expect(screen.getByTestId("joker-edition-badge-foil")).toHaveTextContent(
      "Foil",
    );
  });

  test("a holographic badge renders the Holo label", () => {
    render(<JokerEditionBadge edition="holographic" />);
    expect(
      screen.getByTestId("joker-edition-badge-holographic"),
    ).toHaveTextContent("Holo");
  });

  test("a polychrome badge renders the Poly label", () => {
    render(<JokerEditionBadge edition="polychrome" />);
    expect(
      screen.getByTestId("joker-edition-badge-polychrome"),
    ).toHaveTextContent("Poly");
  });

  test("a negative badge renders the Neg label", () => {
    render(<JokerEditionBadge edition="negative" />);
    expect(
      screen.getByTestId("joker-edition-badge-negative"),
    ).toHaveTextContent("Neg");
  });

  test("a foil badge exposes the edition name and effect in its accessible label", () => {
    render(<JokerEditionBadge edition="foil" />);
    expect(
      screen
        .getByTestId("joker-edition-badge-foil")
        .getAttribute("aria-label"),
    ).toMatch(/Foil edition: \+50 chips when scored/);
  });

  test("a negative badge exposes the slot effect in its accessible label", () => {
    render(<JokerEditionBadge edition="negative" />);
    expect(
      screen
        .getByTestId("joker-edition-badge-negative")
        .getAttribute("aria-label"),
    ).toMatch(/Negative edition: \+1 Joker slot/);
  });
});
