import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import JokerTile from "./JokerTile";
import { localizedJokerDescription } from "../../i18n/jokerOverrides";
import {
  createGreedyJoker,
  createPlusFourMultJoker,
  jokerSellValue,
  withEdition,
} from "../../items/jokers";

type JokerTileProps = ComponentProps<typeof JokerTile>;

function renderTile(overrides: Partial<JokerTileProps> = {}) {
  const joker = overrides.joker ?? createPlusFourMultJoker();
  const props: JokerTileProps = {
    joker,
    idx: 0,
    jokers: [joker],
    pulse: 0,
    isDragging: false,
    draggable: false,
    reorderable: false,
    sellable: false,
    tooltipId: "tooltip-test",
    tooltipAnchorRect: null,
    onOpenTooltip: vi.fn(),
    onCloseTooltip: vi.fn(),
    onMove: vi.fn(),
    onSellAt: vi.fn(),
    onTileDragStart: vi.fn(),
    onTileDragEnd: vi.fn(),
    ...overrides,
  };
  render(
    <ul>
      <JokerTile {...props} />
    </ul>,
  );
  return props;
}

describe("JokerTile", () => {
  test("renders the joker name", () => {
    const joker = createPlusFourMultJoker();
    renderTile({ joker });
    expect(screen.getByText(joker.name)).toBeInTheDocument();
  });

  test("renders the joker description", () => {
    const joker = createGreedyJoker();
    renderTile({ joker });
    expect(
      screen.getByTestId(`joker-tile-description-${joker.id}`),
    ).toHaveTextContent(
      localizedJokerDescription("en", joker.id, joker.description),
    );
  });

  test("shows a sell button with the sell value when sellable", () => {
    const joker = createPlusFourMultJoker();
    renderTile({ joker, sellable: true });
    expect(screen.getByTestId(`joker-sell-${joker.id}`)).toHaveTextContent(
      `Sell $${jokerSellValue(joker)}`,
    );
  });

  test("does not show a sell button when not sellable", () => {
    const joker = createPlusFourMultJoker();
    renderTile({ joker, sellable: false });
    expect(screen.queryByTestId(`joker-sell-${joker.id}`)).not.toBeInTheDocument();
  });

  test("clicking the sell button calls onSellAt with the joker and index", () => {
    const joker = createPlusFourMultJoker();
    const props = renderTile({ joker, idx: 2, sellable: true });
    fireEvent.click(screen.getByTestId(`joker-sell-${joker.id}`));
    expect(props.onSellAt).toHaveBeenCalledWith(joker, 2);
  });

  test("does not show move controls when not reorderable", () => {
    const joker = createPlusFourMultJoker();
    renderTile({ joker, reorderable: false });
    expect(
      screen.queryByTestId(`joker-move-left-${joker.id}`),
    ).not.toBeInTheDocument();
  });

  test("clicking the right move control calls onMove with direction 1", () => {
    const joker = createPlusFourMultJoker();
    const props = renderTile({ joker, idx: 1, reorderable: true });
    fireEvent.click(screen.getByTestId(`joker-move-right-${joker.id}`));
    expect(props.onMove).toHaveBeenCalledWith(joker, 1, 1);
  });

  test("marks a disabled joker as debuffed", () => {
    const joker = { ...createPlusFourMultJoker(), disabled: true };
    renderTile({ joker });
    expect(screen.getByTestId(`joker-tile-filled-${joker.id}`)).toHaveAttribute(
      "data-debuffed",
      "true",
    );
  });

  test("exposes the edition on the tile", () => {
    const joker = withEdition(createPlusFourMultJoker(), "foil");
    renderTile({ joker });
    expect(screen.getByTestId(`joker-tile-filled-${joker.id}`)).toHaveAttribute(
      "data-edition",
      "foil",
    );
  });

  test("focusing the tile opens the tooltip", () => {
    const joker = createPlusFourMultJoker();
    const props = renderTile({ joker });
    fireEvent.focus(screen.getByTestId(`joker-tile-filled-${joker.id}`));
    expect(props.onOpenTooltip).toHaveBeenCalledWith(
      joker.id,
      expect.any(HTMLElement),
    );
  });

  test("applies the pulse class when pulse is positive", () => {
    const joker = createPlusFourMultJoker();
    renderTile({ joker, pulse: 3 });
    expect(screen.getByTestId(`joker-tile-inner-${joker.id}`)).toHaveClass(
      "joker-tile-pulse",
    );
  });

  test("does not apply the pulse class when pulse is zero", () => {
    const joker = createPlusFourMultJoker();
    renderTile({ joker, pulse: 0 });
    expect(screen.getByTestId(`joker-tile-inner-${joker.id}`)).not.toHaveClass(
      "joker-tile-pulse",
    );
  });
});
