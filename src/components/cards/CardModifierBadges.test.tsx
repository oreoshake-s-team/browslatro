import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import CardModifierBadges from "./CardModifierBadges";

describe("CardModifierBadges", () => {
  test("renders an enhancement badge with its label", () => {
    render(<CardModifierBadges scope="x" suffix={0} enhancement="steel" />);
    expect(screen.getByTestId("x-card-enhancement-0")).toHaveTextContent("Steel");
  });

  test("renders a seal badge with its label", () => {
    render(<CardModifierBadges scope="x" suffix={0} seal="red" />);
    expect(screen.getByTestId("x-card-seal-0")).toHaveTextContent("Red Seal");
  });

  test("renders a card edition badge with its label", () => {
    render(<CardModifierBadges scope="x" suffix={0} cardEdition="foil" />);
    expect(screen.getByTestId("x-card-edition-0")).toHaveTextContent("Foil");
  });

  test("renders a joker edition badge with its label", () => {
    render(<CardModifierBadges scope="x" suffix={0} jokerEdition="negative" />);
    expect(screen.getByTestId("x-edition-0")).toHaveTextContent("Negative");
  });

  test("builds the testid from the scope and suffix", () => {
    render(<CardModifierBadges scope="pack" suffix={3} seal="blue" />);
    expect(screen.getByTestId("pack-card-seal-3")).toBeInTheDocument();
  });

  test("renders nothing when no modifiers are set (negative)", () => {
    const { container } = render(
      <CardModifierBadges scope="x" suffix={0} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
