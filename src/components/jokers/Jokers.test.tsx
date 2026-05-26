import { fireEvent, render, screen } from "@testing-library/react";
import Jokers from "./Jokers";
import {
  MAX_JOKERS,
  createBusinessCardJoker,
  createDefaultJokers,
  createGluttonousJoker,
  createGreedyJoker,
  createJokerStencilJoker,
  createLustyJoker,
  createPlusFourMultJoker,
  createWrathfulJoker,
  type Joker,
} from "../../items/jokers";

describe("Jokers UI", () => {
  test("renders MAX_JOKERS tiles in total when no jokers are equipped", () => {
    render(<Jokers jokers={[]} />);
    expect(screen.getAllByTestId("joker-tile-empty")).toHaveLength(MAX_JOKERS);
  });

  test("renders one filled tile per equipped joker", () => {
    render(<Jokers jokers={createDefaultJokers()} />);
    expect(screen.getByTestId("joker-tile-filled-plus-four-mult")).toBeInTheDocument();
  });

  test("renders the Greedy Joker tile when equipped", () => {
    render(<Jokers jokers={[createGreedyJoker()]} />);
    expect(screen.getByTestId("joker-tile-filled-greedy-joker")).toBeInTheDocument();
  });

  test("renders the Lusty Joker tile when equipped", () => {
    render(<Jokers jokers={[createLustyJoker()]} />);
    expect(screen.getByTestId("joker-tile-filled-lusty-joker")).toBeInTheDocument();
  });

  test("renders the Wrathful Joker tile when equipped", () => {
    render(<Jokers jokers={[createWrathfulJoker()]} />);
    expect(screen.getByTestId("joker-tile-filled-wrathful-joker")).toBeInTheDocument();
  });

  test("renders the Gluttonous Joker tile when equipped", () => {
    render(<Jokers jokers={[createGluttonousJoker()]} />);
    expect(screen.getByTestId("joker-tile-filled-gluttonous-joker")).toBeInTheDocument();
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

  test("renders a spacer between consecutive empty slots (issue #221)", () => {
    render(<Jokers jokers={[]} />);
    expect(screen.getAllByTestId(/^joker-gap-empty-/)).toHaveLength(
      MAX_JOKERS - 1,
    );
  });

  test("does not render a leading spacer before the first empty slot (issue #221)", () => {
    render(<Jokers jokers={[]} />);
    expect(screen.queryByTestId("joker-gap-empty-0")).not.toBeInTheDocument();
  });

  test("renders the right number of spacers when only some slots are empty (issue #221)", () => {
    render(<Jokers jokers={createDefaultJokers()} />);
    const emptyCount = MAX_JOKERS - createDefaultJokers().length;
    expect(screen.getAllByTestId(/^joker-gap-empty-/)).toHaveLength(
      emptyCount - 1,
    );
  });

  test("renders no empty-slot spacer when there is only one empty slot (issue #221)", () => {
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
        jokers={createDefaultJokers()}
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

});

describe("Jokers consumable drop zone", () => {
  function dispatchDrag(
    target: Element,
    type: "dragover" | "drop",
    mimes: ReadonlyArray<string>,
  ): boolean {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, "dataTransfer", {
      value: { types: mimes, dropEffect: "" },
    });
    return target.dispatchEvent(event);
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
    const section = screen.getByLabelText("Equipped jokers");
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
    const section = screen.getByLabelText("Equipped jokers");
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
    const section = screen.getByLabelText("Equipped jokers");
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
