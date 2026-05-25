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
});
