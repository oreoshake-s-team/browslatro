import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Jokers from "./Jokers";
import {
  JOKER_EDITION_INFO,
  JOKER_EDITION_KINDS,
  createGreedyJoker,
  createPlusFourMultJoker,
  jokerSellValue,
  withEdition,
  type JokerEdition,
} from "../../items/jokers";

describe("Joker tooltip — open / close affordances", () => {
  test("no tooltip is rendered on initial mount", () => {
    render(<Jokers jokers={[createPlusFourMultJoker()]} />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  test("hovering a filled joker tile renders a tooltip", async () => {
    const user = userEvent.setup();
    render(<Jokers jokers={[createPlusFourMultJoker()]} />);
    await user.hover(screen.getByTestId("joker-tile-filled-plus-four-mult"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  test("unhovering the joker tile removes the tooltip", async () => {
    const user = userEvent.setup();
    render(<Jokers jokers={[createPlusFourMultJoker()]} />);
    const tile = screen.getByTestId("joker-tile-filled-plus-four-mult");
    await user.hover(tile);
    await user.unhover(tile);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  test("focusing the joker tile renders a tooltip (keyboard a11y)", () => {
    render(<Jokers jokers={[createPlusFourMultJoker()]} />);
    fireEvent.focus(screen.getByTestId("joker-tile-filled-plus-four-mult"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  test("blurring the joker tile removes the tooltip", () => {
    render(<Jokers jokers={[createPlusFourMultJoker()]} />);
    const tile = screen.getByTestId("joker-tile-filled-plus-four-mult");
    fireEvent.focus(tile);
    fireEvent.blur(tile);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  test("pressing Escape while the tooltip is open dismisses it", async () => {
    const user = userEvent.setup();
    render(<Jokers jokers={[createPlusFourMultJoker()]} />);
    await user.hover(screen.getByTestId("joker-tile-filled-plus-four-mult"));
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  test("an empty joker slot does not render a tooltip on hover", async () => {
    const user = userEvent.setup();
    render(<Jokers jokers={[]} />);
    const empty = screen.getAllByTestId("joker-tile-empty")[0];
    await user.hover(empty);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  test("filled joker tile is keyboard-focusable", () => {
    render(<Jokers jokers={[createPlusFourMultJoker()]} />);
    expect(screen.getByTestId("joker-tile-filled-plus-four-mult")).toHaveAttribute(
      "tabindex",
      "0",
    );
  });
});

describe("Joker tooltip — accessibility wiring", () => {
  test("the joker tile references the tooltip via aria-describedby while open", async () => {
    const user = userEvent.setup();
    render(<Jokers jokers={[createPlusFourMultJoker()]} />);
    const tile = screen.getByTestId("joker-tile-filled-plus-four-mult");
    await user.hover(tile);
    const tooltip = screen.getByRole("tooltip");
    expect(tile).toHaveAttribute("aria-describedby", tooltip.id);
  });

  test("the joker tile does not carry aria-describedby while closed", () => {
    render(<Jokers jokers={[createPlusFourMultJoker()]} />);
    expect(
      screen.getByTestId("joker-tile-filled-plus-four-mult"),
    ).not.toHaveAttribute("aria-describedby");
  });

  test("the existing accessible name on the joker tile is preserved", () => {
    render(<Jokers jokers={[createPlusFourMultJoker()]} onSell={() => {}} />);
    expect(
      screen.getByTestId("joker-tile-filled-plus-four-mult"),
    ).toHaveAccessibleName(/Shift-click/);
  });
});

describe("Joker tooltip — content", () => {
  test("renders the joker name in the tooltip", async () => {
    const user = userEvent.setup();
    render(<Jokers jokers={[createPlusFourMultJoker()]} />);
    await user.hover(screen.getByTestId("joker-tile-filled-plus-four-mult"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("+4 Mult");
  });

  test("renders the joker description in the tooltip", async () => {
    const user = userEvent.setup();
    render(<Jokers jokers={[createGreedyJoker()]} />);
    await user.hover(screen.getByTestId("joker-tile-filled-greedy-joker"));
    expect(screen.getByRole("tooltip")).toHaveTextContent(/Diamond/);
  });

  test("renders the sell value line matching jokerSellValue", async () => {
    const user = userEvent.setup();
    const joker = createPlusFourMultJoker();
    render(<Jokers jokers={[joker]} />);
    await user.hover(screen.getByTestId(`joker-tile-filled-${joker.id}`));
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      `Sell for $${jokerSellValue(joker)}`,
    );
  });

  test("does not render an edition row on an un-editioned joker", async () => {
    const user = userEvent.setup();
    render(<Jokers jokers={[createPlusFourMultJoker()]} />);
    await user.hover(screen.getByTestId("joker-tile-filled-plus-four-mult"));
    expect(screen.queryByText(/—/)).not.toBeInTheDocument();
  });

  test.each<JokerEdition>(JOKER_EDITION_KINDS)(
    "renders the %s edition row when the joker carries that edition",
    async (edition) => {
      const user = userEvent.setup();
      const joker = withEdition(createPlusFourMultJoker(), edition);
      render(<Jokers jokers={[joker]} />);
      await user.hover(screen.getByTestId(`joker-tile-filled-${joker.id}`));
      expect(screen.getByRole("tooltip")).toHaveTextContent(
        JOKER_EDITION_INFO[edition].name,
      );
    },
  );

  test("the negative edition row carries the edition description from JOKER_EDITION_INFO", async () => {
    const user = userEvent.setup();
    const joker = withEdition(createPlusFourMultJoker(), "negative");
    render(<Jokers jokers={[joker]} />);
    await user.hover(screen.getByTestId(`joker-tile-filled-${joker.id}`));
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      JOKER_EDITION_INFO.negative.description,
    );
  });
});
