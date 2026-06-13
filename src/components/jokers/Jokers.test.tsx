import { act, fireEvent, render, screen } from "@testing-library/react";
import Jokers from "./Jokers";
import LiveAnnouncer from "../system/LiveAnnouncer";
import {
  MAX_JOKERS,
  PERISHABLE_LIFE,
  createBusinessCardJoker,
  createGluttonousJoker,
  createGreedyJoker,
  createJokerStencilJoker,
  createLustyJoker,
  createPlusFourMultJoker,
  createToDoListJoker,
  createWrathfulJoker,
  jokerSellValue,
  withEdition,
  type Joker,
} from "../../items/jokers";
import { useGame } from "../../store/game";

function threeMixedJokers(): Joker[] {
  return [
    createPlusFourMultJoker(),
    createBusinessCardJoker(),
    createJokerStencilJoker(),
  ];
}

describe("Jokers UI", () => {
  test("renders MAX_JOKERS tiles in total when no jokers are equipped", () => {
    render(<Jokers jokers={[]} />);
    expect(screen.getAllByTestId("joker-tile-empty")).toHaveLength(MAX_JOKERS);
  });

  test("renders one filled tile per equipped joker", () => {
    render(<Jokers jokers={threeMixedJokers()} />);
    expect(screen.getByTestId("joker-tile-filled-plus-four-mult")).toBeInTheDocument();
  });

  test.each<{ name: string; testId: string; factory: () => Joker }>([
    { name: "Greedy", testId: "joker-tile-filled-greedy-joker", factory: createGreedyJoker },
    { name: "Lusty", testId: "joker-tile-filled-lusty-joker", factory: createLustyJoker },
    { name: "Wrathful", testId: "joker-tile-filled-wrathful-joker", factory: createWrathfulJoker },
    { name: "Gluttonous", testId: "joker-tile-filled-gluttonous-joker", factory: createGluttonousJoker },
    { name: "Business Card", testId: "joker-tile-filled-business-card", factory: createBusinessCardJoker },
    { name: "Joker Stencil", testId: "joker-tile-filled-joker-stencil", factory: createJokerStencilJoker },
  ])("renders the $name Joker tile when equipped", ({ testId, factory }) => {
    render(<Jokers jokers={[factory()]} />);
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  test("renders the remaining empty slots when a partial set is equipped", () => {
    render(<Jokers jokers={threeMixedJokers()} />);
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

  test("renders a spacer between consecutive empty slots", () => {
    render(<Jokers jokers={[]} />);
    expect(screen.getAllByTestId(/^joker-gap-empty-/)).toHaveLength(
      MAX_JOKERS - 1,
    );
  });

  test("does not render a leading spacer before the first empty slot", () => {
    render(<Jokers jokers={[]} />);
    expect(screen.queryByTestId("joker-gap-empty-0")).not.toBeInTheDocument();
  });

  test("renders the right number of spacers when only some slots are empty", () => {
    render(<Jokers jokers={threeMixedJokers()} />);
    const emptyCount = MAX_JOKERS - threeMixedJokers().length;
    expect(screen.getAllByTestId(/^joker-gap-empty-/)).toHaveLength(
      emptyCount - 1,
    );
  });

  test("renders no empty-slot spacer when there is only one empty slot", () => {
    const four = [
      createPlusFourMultJoker(),
      createBusinessCardJoker(),
      createJokerStencilJoker(),
      createPlusFourMultJoker(),
    ];
    render(<Jokers jokers={four} />);
    expect(screen.queryAllByTestId(/^joker-gap-empty-/)).toHaveLength(0);
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
        jokers={threeMixedJokers()}
        pulseCounters={{ "plus-four-mult": 1 }}
      />,
    );
    expect(
      screen.getByTestId("joker-tile-inner-business-card"),
    ).not.toHaveClass("joker-tile-pulse");
  });
});

describe("Jokers drag-and-drop reordering", () => {
  const three: ReadonlyArray<Joker> = [
    createPlusFourMultJoker(),
    createBusinessCardJoker(),
    createJokerStencilJoker(),
  ];

  function getTile(id: string): HTMLElement {
    return screen.getByTestId(`joker-tile-filled-${id}`);
  }

  function getGap(idx: number): HTMLElement {
    return screen.getByTestId(`joker-gap-${idx}`);
  }

  function dragTileToGap(sourceId: string, gapIdx: number) {
    const source = getTile(sourceId);
    const gap = getGap(gapIdx);
    fireEvent.dragStart(source);
    fireEvent.dragOver(gap);
    fireEvent.drop(gap);
    fireEvent.dragEnd(source);
  }

  test("filled tiles are draggable when onReorder is provided", () => {
    render(<Jokers jokers={three} onReorder={() => {}} />);
    expect(getTile("plus-four-mult").getAttribute("draggable")).toBe("true");
  });

  test("filled tiles are not draggable when onReorder is not provided", () => {
    render(<Jokers jokers={three} />);
    expect(getTile("plus-four-mult").getAttribute("draggable")).toBeNull();
  });

  test("renders one more gap than filled tiles when reorderable", () => {
    render(<Jokers jokers={three} onReorder={() => {}} />);
    expect(screen.getAllByTestId(/^joker-gap-\d+$/)).toHaveLength(
      three.length + 1,
    );
  });

  test("renders no gap drop zones when onReorder is not provided", () => {
    render(<Jokers jokers={three} />);
    expect(screen.queryAllByTestId(/^joker-gap-\d+$/)).toHaveLength(0);
  });

  test("empty slot tiles are not draggable", () => {
    render(<Jokers jokers={three} onReorder={() => {}} />);
    const empties = screen.getAllByTestId("joker-tile-empty");
    expect(empties[0].getAttribute("draggable")).toBeNull();
  });

  test("dropping a tile into the leftmost gap moves it to position 0", () => {
    const onReorder = vi.fn();
    render(<Jokers jokers={three} onReorder={onReorder} />);
    dragTileToGap("joker-stencil", 0);
    expect(onReorder).toHaveBeenCalledWith([
      "joker-stencil",
      "plus-four-mult",
      "business-card",
    ]);
  });

  test("dropping a tile into the trailing gap moves it to the end", () => {
    const onReorder = vi.fn();
    render(<Jokers jokers={three} onReorder={onReorder} />);
    dragTileToGap("plus-four-mult", 3);
    expect(onReorder).toHaveBeenCalledWith([
      "business-card",
      "joker-stencil",
      "plus-four-mult",
    ]);
  });

  test("dropping a tile into a middle gap inserts at that position (left → right)", () => {
    const onReorder = vi.fn();
    render(<Jokers jokers={three} onReorder={onReorder} />);
    dragTileToGap("plus-four-mult", 2);
    expect(onReorder).toHaveBeenCalledWith([
      "business-card",
      "plus-four-mult",
      "joker-stencil",
    ]);
  });

  test("dropping a tile into a middle gap inserts at that position (right → left)", () => {
    const onReorder = vi.fn();
    render(<Jokers jokers={three} onReorder={onReorder} />);
    dragTileToGap("joker-stencil", 1);
    expect(onReorder).toHaveBeenCalledWith([
      "plus-four-mult",
      "joker-stencil",
      "business-card",
    ]);
  });

  test("dropping a tile into its own left-adjacent gap is a no-op", () => {
    const onReorder = vi.fn();
    render(<Jokers jokers={three} onReorder={onReorder} />);
    dragTileToGap("business-card", 1);
    expect(onReorder).not.toHaveBeenCalled();
  });

  test("dropping a tile into its own right-adjacent gap is a no-op", () => {
    const onReorder = vi.fn();
    render(<Jokers jokers={three} onReorder={onReorder} />);
    dragTileToGap("business-card", 2);
    expect(onReorder).not.toHaveBeenCalled();
  });

  test("the dragged tile is marked while a drag is in flight", () => {
    render(<Jokers jokers={three} onReorder={() => {}} />);
    const source = getTile("plus-four-mult");
    fireEvent.dragStart(source);
    expect(source).toHaveClass("joker-tile-dragging");
  });

  test("the hovered gap is marked active while dragging over it", () => {
    render(<Jokers jokers={three} onReorder={() => {}} />);
    fireEvent.dragStart(getTile("plus-four-mult"));
    fireEvent.dragOver(getGap(3));
    expect(getGap(3)).toHaveClass("joker-gap-active");
  });

  test("the source's self-adjacent gap does not become active during drag", () => {
    render(<Jokers jokers={three} onReorder={() => {}} />);
    fireEvent.dragStart(getTile("business-card"));
    fireEvent.dragOver(getGap(1));
    expect(getGap(1)).not.toHaveClass("joker-gap-active");
  });

  test("the active gap is cleared after the drop completes", () => {
    render(<Jokers jokers={three} onReorder={() => {}} />);
    dragTileToGap("plus-four-mult", 3);
    const actives = screen
      .getAllByTestId(/^joker-gap-/)
      .filter((g) => g.classList.contains("joker-gap-active"));
    expect(actives).toHaveLength(0);
  });

  test("dragging over the list activates the gap nearest the cursor", () => {
    const { container } = render(<Jokers jokers={three} onReorder={() => {}} />);
    const list = container.querySelector(".jokers-list");
    if (!list) throw new Error("expected jokers list to render");
    screen.getAllByTestId(/^joker-gap-\d+$/).forEach((gap, i) => {
      gap.getBoundingClientRect = () =>
        ({
          left: i * 100,
          width: 10,
          right: i * 100 + 10,
          top: 0,
          bottom: 0,
          height: 0,
          x: i * 100,
          y: 0,
          toJSON: () => ({}),
        }) as DOMRect;
    });
    fireEvent.dragStart(getTile("plus-four-mult"));
    fireEvent(
      list,
      new MouseEvent("dragover", {
        bubbles: true,
        cancelable: true,
        clientX: 205,
      }),
    );
    expect(getGap(2)).toHaveClass("joker-gap-active");
  });

});

describe("Jokers consumable drop zone", () => {
  function dispatchDrag(
    target: Element,
    type: "dragover" | "drop",
    mimes: ReadonlyArray<string>,
  ): boolean {
    let result = false;
    act(() => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, "dataTransfer", {
        value: { types: mimes, dropEffect: "" },
      });
      result = target.dispatchEvent(event);
    });
    return result;
  }

  test("section accepts a consumable drop and invokes onConsumableDrop", () => {
    const onConsumableDrop = vi.fn();
    render(
      <Jokers
        jokers={[]}
        consumableDropEnabled
        onConsumableDrop={onConsumableDrop}
      />,
    );
    const section = screen.getByTestId("jokers-tray");
    dispatchDrag(section, "dragover", ["application/x-browslatro-consumable"]);
    dispatchDrag(section, "drop", ["application/x-browslatro-consumable"]);
    expect(onConsumableDrop).toHaveBeenCalledTimes(1);
  });

  test("section ignores a drop whose data is not a consumable", () => {
    const onConsumableDrop = vi.fn();
    render(
      <Jokers
        jokers={[]}
        consumableDropEnabled
        onConsumableDrop={onConsumableDrop}
      />,
    );
    const section = screen.getByTestId("jokers-tray");
    dispatchDrag(section, "drop", ["text/plain"]);
    expect(onConsumableDrop).not.toHaveBeenCalled();
  });

  test("section does not accept the drop when consumableDropEnabled is false", () => {
    const onConsumableDrop = vi.fn();
    render(
      <Jokers
        jokers={[]}
        consumableDropEnabled={false}
        onConsumableDrop={onConsumableDrop}
      />,
    );
    const section = screen.getByTestId("jokers-tray");
    dispatchDrag(section, "drop", ["application/x-browslatro-consumable"]);
    expect(onConsumableDrop).not.toHaveBeenCalled();
  });

  test("renders a Use overlay label when consumableDropEnabled is true", () => {
    render(
      <Jokers
        jokers={[]}
        consumableDropEnabled
        onConsumableDrop={() => {}}
      />,
    );
    expect(screen.getByTestId("consumable-drop-overlay-use")).toHaveTextContent(
      "Use",
    );
  });

  test("does not render a Use overlay when consumableDropEnabled is false", () => {
    render(
      <Jokers
        jokers={[]}
        consumableDropEnabled={false}
        onConsumableDrop={() => {}}
      />,
    );
    expect(
      screen.queryByTestId("consumable-drop-overlay-use"),
    ).not.toBeInTheDocument();
  });
});

describe("Jokers sell", () => {
  const filled: ReadonlyArray<Joker> = [
    createPlusFourMultJoker(),
    createBusinessCardJoker(),
  ];

  function sellChips(): Element[] {
    return Array.from(document.querySelectorAll(".joker-tile-sell"));
  }

  test("does not render a Sell drag chip at rest, even when onSell is provided", () => {
    render(<Jokers jokers={filled} onSell={() => {}} />);
    expect(sellChips()).toHaveLength(0);
  });

  test("renders a Sell drag chip on the dragged tile only after dragstart", () => {
    render(<Jokers jokers={filled} onSell={() => {}} />);
    fireEvent.dragStart(screen.getByTestId("joker-tile-filled-business-card"));
    expect(sellChips()).toHaveLength(1);
  });

  test("Sell drag chip disappears after dragend", () => {
    render(<Jokers jokers={filled} onSell={() => {}} />);
    const tile = screen.getByTestId("joker-tile-filled-business-card");
    fireEvent.dragStart(tile);
    fireEvent.dragEnd(tile);
    expect(sellChips()).toHaveLength(0);
  });

  test("does not render a Sell drag chip when onSell is not provided", () => {
    render(<Jokers jokers={filled} />);
    fireEvent.dragStart(screen.getByTestId("joker-tile-filled-business-card"));
    expect(sellChips()).toHaveLength(0);
  });

  test("shift-clicking a tile invokes onSell with its index", () => {
    const onSell = vi.fn();
    render(<Jokers jokers={filled} onSell={onSell} />);
    fireEvent.click(screen.getByTestId("joker-tile-filled-business-card"), {
      shiftKey: true,
    });
    expect(onSell).toHaveBeenCalledWith(1);
  });

  test("non-shift clicking a sellable tile does not invoke onSell", () => {
    const onSell = vi.fn();
    render(<Jokers jokers={filled} onSell={onSell} />);
    fireEvent.click(screen.getByTestId("joker-tile-filled-plus-four-mult"));
    expect(onSell).not.toHaveBeenCalled();
  });

  test("aria-label on a sellable tile names the sell shortcut", () => {
    render(<Jokers jokers={filled} onSell={() => {}} />);
    expect(
      screen.getByTestId("joker-tile-filled-plus-four-mult"),
    ).toHaveAttribute("aria-label", expect.stringContaining("Shift-click"));
  });

  test("tiles are draggable when only onSell is provided (no reorder)", () => {
    render(<Jokers jokers={filled} onSell={() => {}} />);
    expect(
      screen.getByTestId("joker-tile-filled-plus-four-mult").getAttribute("draggable"),
    ).toBe("true");
  });

  test("dragstart on a sellable tile writes the joker drag MIME and the index", () => {
    const setData = vi.fn();
    render(<Jokers jokers={filled} onSell={() => {}} />);
    const tile = screen.getByTestId("joker-tile-filled-business-card");
    act(() => {
      const event = new Event("dragstart", { bubbles: true });
      Object.defineProperty(event, "dataTransfer", {
        value: { setData, effectAllowed: "" },
      });
      tile.dispatchEvent(event);
    });
    expect(setData).toHaveBeenCalledWith(
      "application/x-browslatro-joker",
      "1",
    );
  });

  test("dragstart invokes onDragStart with the tile's index", () => {
    const onDragStart = vi.fn();
    render(<Jokers jokers={filled} onSell={() => {}} onDragStart={onDragStart} />);
    const tile = screen.getByTestId("joker-tile-filled-business-card");
    act(() => {
      const event = new Event("dragstart", { bubbles: true });
      Object.defineProperty(event, "dataTransfer", {
        value: { setData: vi.fn(), effectAllowed: "" },
      });
      tile.dispatchEvent(event);
    });
    expect(onDragStart).toHaveBeenCalledWith(1);
  });

  test("dragend invokes onDragEnd", () => {
    const onDragEnd = vi.fn();
    render(<Jokers jokers={filled} onSell={() => {}} onDragEnd={onDragEnd} />);
    fireEvent.dragEnd(screen.getByTestId("joker-tile-filled-plus-four-mult"));
    expect(onDragEnd).toHaveBeenCalled();
  });
});

describe("Jokers sell — Eternal joker guard", () => {
  const eternalJoker: Joker = {
    ...createBusinessCardJoker(),
    stickers: [{ kind: "eternal" }],
  };

  test("an Eternal joker does not show a Sell chip on dragstart (negative)", () => {
    render(<Jokers jokers={[eternalJoker]} onSell={() => {}} />);
    fireEvent.dragStart(screen.getByTestId("joker-tile-filled-business-card"));
    expect(screen.queryByText(/^Sell \$/)).not.toBeInTheDocument();
  });

  test("shift-clicking an Eternal joker does not invoke onSell (negative)", () => {
    const onSell = vi.fn();
    render(<Jokers jokers={[eternalJoker]} onSell={onSell} />);
    fireEvent.click(screen.getByTestId("joker-tile-filled-business-card"), {
      shiftKey: true,
    });
    expect(onSell).not.toHaveBeenCalled();
  });

  test("an Eternal tile's aria-label does not mention the sell shortcut", () => {
    render(<Jokers jokers={[eternalJoker]} onSell={() => {}} />);
    const label =
      screen
        .getByTestId("joker-tile-filled-business-card")
        .getAttribute("aria-label") ?? "";
    expect(label).not.toMatch(/Shift-click/);
  });
});

describe("Jokers keyboard reorder and sell", () => {
  const three: ReadonlyArray<Joker> = [
    createPlusFourMultJoker(),
    createBusinessCardJoker(),
    createJokerStencilJoker(),
  ];

  test("Move right reorders the joker one slot to the right", () => {
    const onReorder = vi.fn();
    render(<Jokers jokers={three} onReorder={onReorder} />);
    fireEvent.click(screen.getByTestId("joker-move-right-plus-four-mult"));
    expect(onReorder).toHaveBeenCalledWith([
      "business-card",
      "plus-four-mult",
      "joker-stencil",
    ]);
  });

  test("Move left reorders the joker one slot to the left", () => {
    const onReorder = vi.fn();
    render(<Jokers jokers={three} onReorder={onReorder} />);
    fireEvent.click(screen.getByTestId("joker-move-left-joker-stencil"));
    expect(onReorder).toHaveBeenCalledWith([
      "plus-four-mult",
      "joker-stencil",
      "business-card",
    ]);
  });

  test("a keyboard move announces the joker's new position", () => {
    render(
      <>
        <Jokers jokers={three} onReorder={() => {}} />
        <LiveAnnouncer />
      </>,
    );
    fireEvent.click(screen.getByTestId("joker-move-right-plus-four-mult"));
    expect(screen.getByTestId("live-announcer")).toHaveTextContent(
      "+4 Mult moved to position 2 of 3",
    );
  });

  test("Move left on the first joker announces it is already first and does not reorder", () => {
    const onReorder = vi.fn();
    render(
      <>
        <Jokers jokers={three} onReorder={onReorder} />
        <LiveAnnouncer />
      </>,
    );
    fireEvent.click(screen.getByTestId("joker-move-left-plus-four-mult"));
    expect(onReorder).not.toHaveBeenCalled();
    expect(screen.getByTestId("live-announcer")).toHaveTextContent(
      "+4 Mult is already at the first position",
    );
  });

  test("Move right on the last joker announces it is already last and does not reorder", () => {
    const onReorder = vi.fn();
    render(
      <>
        <Jokers jokers={three} onReorder={onReorder} />
        <LiveAnnouncer />
      </>,
    );
    fireEvent.click(screen.getByTestId("joker-move-right-joker-stencil"));
    expect(onReorder).not.toHaveBeenCalled();
    expect(screen.getByTestId("live-announcer")).toHaveTextContent(
      "Joker Stencil is already at the last position",
    );
  });

  test("move controls are not rendered when onReorder is missing", () => {
    render(<Jokers jokers={three} onSell={() => {}} />);
    expect(
      screen.queryByTestId("joker-move-left-plus-four-mult"),
    ).not.toBeInTheDocument();
  });

  test("the sell button invokes onSell with the joker's index", () => {
    const onSell = vi.fn();
    render(<Jokers jokers={three} onSell={onSell} />);
    fireEvent.click(screen.getByTestId("joker-sell-business-card"));
    expect(onSell).toHaveBeenCalledWith(1);
  });

  test("the sell button names the joker and its sell value", () => {
    render(<Jokers jokers={three} onSell={() => {}} />);
    const value = jokerSellValue(three[0]);
    expect(screen.getByTestId("joker-sell-plus-four-mult")).toHaveAttribute(
      "aria-label",
      `Sell +4 Mult (worth $${value})`,
    );
  });

  test("selling via the button announces the sale", () => {
    render(
      <>
        <Jokers jokers={three} onSell={() => {}} />
        <LiveAnnouncer />
      </>,
    );
    fireEvent.click(screen.getByTestId("joker-sell-business-card"));
    expect(screen.getByTestId("live-announcer")).toHaveTextContent(
      `Sold Business Card for $${jokerSellValue(three[1])}`,
    );
  });

  test("no sell button is rendered when onSell is missing", () => {
    render(<Jokers jokers={three} onReorder={() => {}} />);
    expect(
      screen.queryByTestId("joker-sell-plus-four-mult"),
    ).not.toBeInTheDocument();
  });

  test("no sell button is rendered for an Eternal joker", () => {
    const eternal: Joker = {
      ...createBusinessCardJoker(),
      stickers: [{ kind: "eternal" }],
    };
    render(<Jokers jokers={[eternal]} onSell={() => {}} />);
    expect(
      screen.queryByTestId("joker-sell-business-card"),
    ).not.toBeInTheDocument();
  });

  test("clicking the sell button does not double-fire via the tile's shift-click path", () => {
    const onSell = vi.fn();
    render(<Jokers jokers={three} onSell={onSell} />);
    fireEvent.click(screen.getByTestId("joker-sell-business-card"), {
      shiftKey: true,
    });
    expect(onSell).toHaveBeenCalledTimes(1);
  });
});

describe("Jokers edition rendering", () => {
  test("an editioned joker tile renders its edition badge", () => {
    const j = withEdition(createPlusFourMultJoker(), "foil");
    render(<Jokers jokers={[j]} />);
    expect(screen.getByTestId("joker-edition-badge-foil")).toBeInTheDocument();
  });

  test("an un-editioned joker tile renders no edition badge (negative)", () => {
    const j = createPlusFourMultJoker();
    render(<Jokers jokers={[j]} />);
    expect(
      screen.queryByTestId(/^joker-edition-badge-/),
    ).not.toBeInTheDocument();
  });

  test("an edition badge shares the badge row with sticker badges", () => {
    const j = {
      ...withEdition(createPlusFourMultJoker(), "foil"),
      stickers: [{ kind: "eternal" }],
    } satisfies Joker;
    const { container } = render(<Jokers jokers={[j]} />);
    const row = container.querySelector(".joker-tile-badges");
    expect(row?.querySelector(".joker-edition-badge")).not.toBeNull();
    expect(row?.querySelector(".joker-sticker-badge")).not.toBeNull();
  });

  test("a Foil joker tile carries the foil edition class", () => {
    const j = withEdition(createPlusFourMultJoker(), "foil");
    render(<Jokers jokers={[j]} />);
    expect(screen.getByTestId(`joker-tile-filled-${j.id}`)).toHaveClass(
      "joker-tile-edition-foil",
    );
  });

  test("a Holographic joker tile carries the holographic edition class", () => {
    const j = withEdition(createPlusFourMultJoker(), "holographic");
    render(<Jokers jokers={[j]} />);
    expect(screen.getByTestId(`joker-tile-filled-${j.id}`)).toHaveClass(
      "joker-tile-edition-holographic",
    );
  });

  test("a Polychrome joker tile carries the polychrome edition class", () => {
    const j = withEdition(createPlusFourMultJoker(), "polychrome");
    render(<Jokers jokers={[j]} />);
    expect(screen.getByTestId(`joker-tile-filled-${j.id}`)).toHaveClass(
      "joker-tile-edition-polychrome",
    );
  });

  test("a Negative joker tile carries the negative edition class", () => {
    const j = withEdition(createPlusFourMultJoker(), "negative");
    render(<Jokers jokers={[j]} />);
    expect(screen.getByTestId(`joker-tile-filled-${j.id}`)).toHaveClass(
      "joker-tile-edition-negative",
    );
  });

  test("an un-editioned joker tile does not carry the generic edition class", () => {
    const j = createPlusFourMultJoker();
    render(<Jokers jokers={[j]} />);
    expect(screen.getByTestId(`joker-tile-filled-${j.id}`)).not.toHaveClass(
      "joker-tile-edition",
    );
  });

  test("an editioned tile exposes the edition via data-edition", () => {
    const j = withEdition(createPlusFourMultJoker(), "polychrome");
    render(<Jokers jokers={[j]} />);
    expect(screen.getByTestId(`joker-tile-filled-${j.id}`)).toHaveAttribute(
      "data-edition",
      "polychrome",
    );
  });

  test("an editioned tile mentions the edition in its accessible name", () => {
    const j = withEdition(createPlusFourMultJoker(), "foil");
    render(<Jokers jokers={[j]} onSell={() => {}} />);
    expect(
      screen.getByTestId(`joker-tile-filled-${j.id}`),
    ).toHaveAccessibleName(/Foil edition/);
  });

  test("a Negative joker frees a slot — MAX_JOKERS empty tiles still render alongside one Negative", () => {
    const j = withEdition(createPlusFourMultJoker(), "negative");
    render(<Jokers jokers={[j]} />);
    expect(screen.getAllByTestId("joker-tile-empty")).toHaveLength(MAX_JOKERS);
  });

  test("a non-Negative joker still consumes one of the MAX_JOKERS slots", () => {
    render(<Jokers jokers={[createPlusFourMultJoker()]} />);
    expect(screen.getAllByTestId("joker-tile-empty")).toHaveLength(
      MAX_JOKERS - 1,
    );
  });
});

describe("Jokers UI — capacity prop", () => {
  test("a capacity larger than MAX_JOKERS renders the extra empty slot", () => {
    render(<Jokers jokers={[]} capacity={MAX_JOKERS + 1} />);
    expect(screen.getAllByTestId("joker-tile-empty")).toHaveLength(
      MAX_JOKERS + 1,
    );
  });

  test("a capacity equal to MAX_JOKERS matches default behaviour (negative)", () => {
    render(<Jokers jokers={[]} capacity={MAX_JOKERS} />);
    expect(screen.getAllByTestId("joker-tile-empty")).toHaveLength(MAX_JOKERS);
  });
});

describe("Jokers UI — Perishable debuffed visual", () => {
  function withPerishable(roundsHeld: number): Joker {
    return {
      ...createPlusFourMultJoker(),
      stickers: [{ kind: "perishable", roundsHeld }],
    };
  }

  test("a perishable joker past its life is rendered with the joker-tile-debuffed class", () => {
    const j = withPerishable(PERISHABLE_LIFE);
    render(<Jokers jokers={[j]} />);
    expect(screen.getByTestId(`joker-tile-filled-${j.id}`)).toHaveClass(
      "joker-tile-debuffed",
    );
  });

  test("a perishable joker past its life exposes data-debuffed", () => {
    const j = withPerishable(PERISHABLE_LIFE);
    render(<Jokers jokers={[j]} />);
    expect(screen.getByTestId(`joker-tile-filled-${j.id}`)).toHaveAttribute(
      "data-debuffed",
      "true",
    );
  });

  test("a still-active perishable joker has no debuffed class (negative)", () => {
    const j = withPerishable(PERISHABLE_LIFE - 1);
    render(<Jokers jokers={[j]} />);
    expect(screen.getByTestId(`joker-tile-filled-${j.id}`)).not.toHaveClass(
      "joker-tile-debuffed",
    );
  });

  test("a debuffed perishable joker mentions 'Debuffed' in its accessible name when sellable", () => {
    const j = withPerishable(PERISHABLE_LIFE);
    render(<Jokers jokers={[j]} onSell={() => {}} />);
    expect(
      screen.getByTestId(`joker-tile-filled-${j.id}`),
    ).toHaveAccessibleName(/Debuffed/);
  });

  test("a debuffed perishable joker is still sellable via shift-click (no Eternal guard)", () => {
    const onSell = vi.fn();
    const j = withPerishable(PERISHABLE_LIFE);
    render(<Jokers jokers={[j]} onSell={onSell} />);
    fireEvent.click(screen.getByTestId(`joker-tile-filled-${j.id}`), {
      shiftKey: true,
    });
    expect(onSell).toHaveBeenCalledTimes(1);
  });
});

describe("Empty tray treatment", () => {
  test("the tray carries the jokers-tray-empty class when no jokers are equipped", () => {
    render(<Jokers jokers={[]} />);
    expect(screen.getByTestId("jokers-tray")).toHaveClass("jokers-tray-empty");
  });

  test("negative: the tray drops the empty class once a joker is equipped", () => {
    render(<Jokers jokers={[createGreedyJoker()]} />);
    expect(screen.getByTestId("jokers-tray")).not.toHaveClass("jokers-tray-empty");
  });
});

describe("To Do List tile description", () => {
  test("tile description shows the current hand bolded when todoHand is set", () => {
    useGame.getState().setTodoHand("Flush");
    render(<Jokers jokers={[createToDoListJoker()]} />);
    const desc = screen.getByTestId("joker-tile-description-to-do-list");
    expect(desc).toHaveTextContent(/Currently: Flush/);
    expect(desc.querySelector("strong")).toHaveTextContent("Flush");
  });

  test("tile description shows ??? placeholder when todoHand is null", () => {
    useGame.getState().setTodoHand(null);
    render(<Jokers jokers={[createToDoListJoker()]} />);
    const desc = screen.getByTestId("joker-tile-description-to-do-list");
    expect(desc).toHaveTextContent(/Currently: \?\?\?/);
    expect(desc.querySelector("strong")).toHaveTextContent("???");
  });

  test("negative: other joker tile descriptions are unaffected by todoHand state", () => {
    useGame.getState().setTodoHand("Two Pair");
    render(<Jokers jokers={[createGreedyJoker()]} />);
    const desc = screen.getByTestId("joker-tile-description-greedy-joker");
    expect(desc).not.toHaveTextContent(/Currently:/);
  });
});

describe("Jokers UI — face-down (Amber Acorn)", () => {
  test("renders a face-down tile for each equipped joker", () => {
    render(<Jokers jokers={threeMixedJokers()} faceDown />);
    expect(screen.getAllByTestId("joker-tile-face-down")).toHaveLength(3);
  });

  test("hides the joker name while face-down", () => {
    render(<Jokers jokers={threeMixedJokers()} faceDown />);
    expect(screen.queryByText("+4 Mult")).not.toBeInTheDocument();
  });

  test("announces the slot position without revealing identity", () => {
    render(<Jokers jokers={threeMixedJokers()} faceDown />);
    expect(
      screen.getByLabelText("Face-down joker, slot 1 of 3"),
    ).toBeInTheDocument();
  });

  test("suppresses the sell control while face-down (negative)", () => {
    render(<Jokers jokers={threeMixedJokers()} faceDown onSell={vi.fn()} />);
    expect(
      screen.queryByTestId("joker-sell-plus-four-mult"),
    ).not.toBeInTheDocument();
  });

  test("renders normal filled tiles when faceDown is not set (negative)", () => {
    render(<Jokers jokers={threeMixedJokers()} />);
    expect(screen.queryByTestId("joker-tile-face-down")).not.toBeInTheDocument();
  });
});
