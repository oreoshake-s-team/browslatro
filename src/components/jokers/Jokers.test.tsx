import { render, screen } from "@testing-library/react";
import Jokers from "./Jokers";
import {
  MAX_JOKERS,
  createBusinessCardJoker,
  createDefaultJokers,
  createJokerStencilJoker,
  createPlusFourMultJoker,
} from "../../jokers";

describe("Jokers UI", () => {
  test("renders MAX_JOKERS tiles in total when no jokers are equipped", () => {
    render(<Jokers jokers={[]} />);
    expect(screen.getAllByTestId("joker-tile-empty")).toHaveLength(MAX_JOKERS);
  });

  test("renders one filled tile per equipped joker", () => {
    render(<Jokers jokers={createDefaultJokers()} />);
    expect(screen.getByTestId("joker-tile-filled-plus-four-mult")).toBeInTheDocument();
  });

  test("renders the Business Card joker tile when equipped", () => {
    render(<Jokers jokers={[createBusinessCardJoker()]} />);
    expect(screen.getByTestId("joker-tile-filled-business-card")).toBeInTheDocument();
  });

  test("renders the Joker Stencil tile when equipped", () => {
    render(<Jokers jokers={[createJokerStencilJoker()]} />);
    expect(screen.getByTestId("joker-tile-filled-joker-stencil")).toBeInTheDocument();
  });

  test("renders the remaining empty slots when a partial set is equipped", () => {
    render(<Jokers jokers={createDefaultJokers()} />);
    expect(screen.getAllByTestId("joker-tile-empty")).toHaveLength(MAX_JOKERS - 3);
  });

  test("renders zero empty slots when all MAX_JOKERS are filled", () => {
    const five = [
      createPlusFourMultJoker(),
      createBusinessCardJoker(),
      createJokerStencilJoker(),
      createPlusFourMultJoker(),
      createBusinessCardJoker(),
    ];
    render(<Jokers jokers={five} />);
    expect(screen.queryAllByTestId("joker-tile-empty")).toHaveLength(0);
  });

  test("displays the joker name", () => {
    render(<Jokers jokers={[createPlusFourMultJoker()]} />);
    expect(screen.getByText("+4 Mult")).toBeInTheDocument();
  });

  test("displays the joker description", () => {
    render(<Jokers jokers={[createPlusFourMultJoker()]} />);
    expect(screen.getByText("Adds +4 Mult to every played hand")).toBeInTheDocument();
  });

  test("does not apply the pulse class when the joker has not fired", () => {
    render(<Jokers jokers={[createPlusFourMultJoker()]} pulseCounters={{}} />);
    expect(
      screen.getByTestId("joker-tile-inner-plus-four-mult"),
    ).not.toHaveClass("joker-tile-pulse");
  });

  test("applies the pulse class when the joker's counter is non-zero", () => {
    render(
      <Jokers
        jokers={[createPlusFourMultJoker()]}
        pulseCounters={{ "plus-four-mult": 1 }}
      />,
    );
    expect(
      screen.getByTestId("joker-tile-inner-plus-four-mult"),
    ).toHaveClass("joker-tile-pulse");
  });

  test("reflects the current pulse count on the inner element", () => {
    render(
      <Jokers
        jokers={[createPlusFourMultJoker()]}
        pulseCounters={{ "plus-four-mult": 3 }}
      />,
    );
    expect(
      screen.getByTestId("joker-tile-inner-plus-four-mult"),
    ).toHaveAttribute("data-pulse", "3");
  });

  test("leaves other jokers' inner elements unpulsed when only one joker fires", () => {
    render(
      <Jokers
        jokers={createDefaultJokers()}
        pulseCounters={{ "plus-four-mult": 1 }}
      />,
    );
    expect(
      screen.getByTestId("joker-tile-inner-business-card"),
    ).not.toHaveClass("joker-tile-pulse");
  });
});
