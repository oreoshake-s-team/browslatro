import { beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Jokers from "./Jokers";
import {
  DRIVERS_LICENSE_ENHANCED_THRESHOLD,
  JOKER_EDITION_INFO,
  JOKER_EDITION_KINDS,
  JOKER_STICKER_INFO,
  PERISHABLE_LIFE,
  createDriversLicenseJoker,
  createGreedyJoker,
  createPlusFourMultJoker,
  jokerSellValue,
  withEdition,
  type Joker,
  type JokerEdition,
} from "../../items/jokers";
import { useGame } from "../../store/game";
import type { Enhancement } from "../../cards/types";

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

describe("Joker tooltip — stickers (#724)", () => {
  function withStickers(stickers: Joker["stickers"]): Joker {
    return { ...createPlusFourMultJoker(), stickers };
  }

  test("does not render any sticker row on a plain joker", async () => {
    const user = userEvent.setup();
    render(<Jokers jokers={[createPlusFourMultJoker()]} />);
    await user.hover(screen.getByTestId("joker-tile-filled-plus-four-mult"));
    expect(
      screen.queryByTestId("joker-tooltip-sticker-eternal"),
    ).not.toBeInTheDocument();
  });

  test("renders the Eternal sticker row when present", async () => {
    const user = userEvent.setup();
    const joker = withStickers([{ kind: "eternal" }]);
    render(<Jokers jokers={[joker]} />);
    await user.hover(screen.getByTestId(`joker-tile-filled-${joker.id}`));
    expect(
      screen.getByTestId("joker-tooltip-sticker-eternal"),
    ).toHaveTextContent(JOKER_STICKER_INFO.eternal.description);
  });

  test("renders the Rental sticker row with its info text", async () => {
    const user = userEvent.setup();
    const joker = withStickers([{ kind: "rental" }]);
    render(<Jokers jokers={[joker]} />);
    await user.hover(screen.getByTestId(`joker-tile-filled-${joker.id}`));
    expect(
      screen.getByTestId("joker-tooltip-sticker-rental"),
    ).toHaveTextContent(JOKER_STICKER_INFO.rental.description);
  });

  test("Perishable sticker row shows remaining rounds dynamically", async () => {
    const user = userEvent.setup();
    const joker = withStickers([
      { kind: "perishable", roundsHeld: 2 },
    ]);
    render(<Jokers jokers={[joker]} />);
    await user.hover(screen.getByTestId(`joker-tile-filled-${joker.id}`));
    expect(
      screen.getByTestId("joker-tooltip-sticker-perishable"),
    ).toHaveTextContent(`${PERISHABLE_LIFE - 2} of ${PERISHABLE_LIFE} rounds`);
  });

  test("Perishable sticker row says 'debuffed' once roundsHeld reaches the life threshold (closes #579)", async () => {
    const user = userEvent.setup();
    const joker = withStickers([
      { kind: "perishable", roundsHeld: PERISHABLE_LIFE },
    ]);
    render(<Jokers jokers={[joker]} />);
    await user.hover(screen.getByTestId(`joker-tile-filled-${joker.id}`));
    expect(
      screen.getByTestId("joker-tooltip-sticker-perishable"),
    ).toHaveTextContent(/debuffed/i);
  });
});

describe("Joker tooltip — Driver's License enhanced-count progress (#632)", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  function setEnhancementOverrides(
    pairs: ReadonlyArray<[string, Enhancement]>,
  ): void {
    const base = useGame.getState().baseDeckCards;
    const lookup = new Map<string, number>();
    for (const c of base) lookup.set(`${c.rank}-${c.suit}`, c.id);
    const idPairs: Array<[number, Enhancement]> = [];
    for (const [rankSuit, enhancement] of pairs) {
      const id = lookup.get(rankSuit);
      if (id === undefined) throw new Error(`Unknown card key: ${rankSuit}`);
      idPairs.push([id, enhancement]);
    }
    useGame.getState().setCardEnhancementsById(new Map(idPairs));
  }

  test("does not show the progress line for jokers without the threshold effect", async () => {
    const user = userEvent.setup();
    render(<Jokers jokers={[createPlusFourMultJoker()]} />);
    await user.hover(screen.getByTestId("joker-tile-filled-plus-four-mult"));
    expect(
      screen.queryByTestId("joker-tooltip-enhanced-progress"),
    ).not.toBeInTheDocument();
  });

  test("shows the progress line for Driver's License when its tooltip opens", async () => {
    const user = userEvent.setup();
    render(<Jokers jokers={[createDriversLicenseJoker()]} />);
    await user.hover(screen.getByTestId("joker-tile-filled-drivers-license"));
    expect(
      screen.getByTestId("joker-tooltip-enhanced-progress"),
    ).toBeInTheDocument();
  });

  test("renders zero / threshold when no cards are enhanced", async () => {
    const user = userEvent.setup();
    render(<Jokers jokers={[createDriversLicenseJoker()]} />);
    await user.hover(screen.getByTestId("joker-tile-filled-drivers-license"));
    expect(
      screen.getByTestId("joker-tooltip-enhanced-progress"),
    ).toHaveTextContent(`0 / ${DRIVERS_LICENSE_ENHANCED_THRESHOLD}`);
  });

  test("renders the live enhanced count from the store", async () => {
    setEnhancementOverrides([
      ["A-spades", "gold"],
      ["K-hearts", "steel"],
      ["5-diamonds", "glass"],
    ]);
    const user = userEvent.setup();
    render(<Jokers jokers={[createDriversLicenseJoker()]} />);
    await user.hover(screen.getByTestId("joker-tile-filled-drivers-license"));
    expect(
      screen.getByTestId("joker-tooltip-enhanced-progress"),
    ).toHaveTextContent(`3 / ${DRIVERS_LICENSE_ENHANCED_THRESHOLD}`);
  });

  test("counts the threshold count when it is reached", async () => {
    const pairs: Array<[string, Enhancement]> = [];
    const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2", "3", "4"];
    const suits = ["spades", "hearts", "diamonds", "clubs"];
    for (let i = 0; i < DRIVERS_LICENSE_ENHANCED_THRESHOLD; i += 1) {
      pairs.push([`${ranks[i]}-${suits[i % 4]}`, "gold"]);
    }
    setEnhancementOverrides(pairs);
    const user = userEvent.setup();
    render(<Jokers jokers={[createDriversLicenseJoker()]} />);
    await user.hover(screen.getByTestId("joker-tile-filled-drivers-license"));
    expect(
      screen.getByTestId("joker-tooltip-enhanced-progress"),
    ).toHaveTextContent(
      `${DRIVERS_LICENSE_ENHANCED_THRESHOLD} / ${DRIVERS_LICENSE_ENHANCED_THRESHOLD}`,
    );
  });
});
