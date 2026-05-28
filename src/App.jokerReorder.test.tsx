import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import {
  createBusinessCardJoker,
  createPlusFourMultJoker,
  initialJokersConfig,
} from "./items/jokers";
import {
  dismissBlindSelect,
  flushDiscardAnimation,
  getHandCardButtons,
  mockDeckConfig,
  mockShuffleConfig,
  setupAppTestEnvironment,
} from "./App.test-helpers";

vi.mock("./components/system/sounds", () => ({ play: vi.fn() }));

vi.mock("./cards/deck", async () => {
  const actual = await vi.importActual<typeof import("./cards/deck")>("./cards/deck");
  return {
    ...actual,
    shuffle: <T,>(items: ReadonlyArray<T>): T[] => {
      if (mockShuffleConfig.useReverse) return items.slice().reverse();
      return mockShuffleConfig.useIdentity ? items.slice() : actual.shuffle(items);
    },
    createDeck: (excluded?: ReadonlySet<string>) => {
      const deck = actual.createDeck(excluded);
      if (!mockDeckConfig.useDefaultEnhancements) return deck;
      return deck.map((c) => ({
        ...c,
        enhancement: actual.defaultEnhancementForRank(c.rank),
      }));
    },
  };
});

setupAppTestEnvironment();

function fakeDataTransfer(): DataTransfer {
  const store: Record<string, string> = {};
  const types: string[] = [];
  return {
    types,
    effectAllowed: "",
    dropEffect: "",
    setData(format: string, data: string) {
      if (!(format in store)) types.push(format);
      store[format] = data;
    },
    getData(format: string) {
      return store[format] ?? "";
    },
  } as unknown as DataTransfer;
}

function filledJokerIds(): string[] {
  return screen
    .getAllByTestId(/^joker-tile-filled-/)
    .map((el) =>
      (el.getAttribute("data-testid") ?? "").replace("joker-tile-filled-", ""),
    );
}

function dragTileToGap(sourceId: string, gapIdx: number): void {
  const tile = screen.getByTestId(`joker-tile-filled-${sourceId}`);
  const gap = screen.getByTestId(`joker-gap-${gapIdx}`);
  const dt = fakeDataTransfer();
  fireEvent.dragStart(tile, { dataTransfer: dt });
  fireEvent.dragOver(gap, { dataTransfer: dt });
  fireEvent.drop(gap, { dataTransfer: dt });
  fireEvent.dragEnd(tile, { dataTransfer: dt });
}

describe("Joker drag-reorder during shop and pack-pick (#399)", () => {
  const originalFactory = initialJokersConfig.factory;

  beforeEach(() => {
    initialJokersConfig.factory = () => [
      createPlusFourMultJoker(),
      createBusinessCardJoker(),
    ];
  });

  afterEach(() => {
    initialJokersConfig.factory = originalFactory;
  });

  function openPackOffer(
    user: ReturnType<typeof userEvent.setup>,
  ): Promise<void> {
    const offers = screen.getAllByTestId(/^shop-offer-/);
    const packIdx = offers.findIndex(
      (el) => el.getAttribute("data-offer-kind") === "pack",
    );
    const openBtn = offers[packIdx].querySelector(
      "button.shop-offer-buy",
    ) as HTMLButtonElement;
    return user.click(openBtn);
  }

  async function reachShop(): Promise<ReturnType<typeof userEvent.setup>> {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(screen.getByRole("button", { name: /Continue/ }));
    return user;
  }

  async function reachPackPick(): Promise<ReturnType<typeof userEvent.setup>> {
    const user = await reachShop();
    await openPackOffer(user);
    return user;
  }

  test("the joker order starts as equipped", async () => {
    await reachShop();
    expect(filledJokerIds()).toEqual(["plus-four-mult", "business-card"]);
  });

  test("dragging a joker to the leftmost gap reorders it while the shop is open", async () => {
    await reachShop();
    dragTileToGap("business-card", 0);
    expect(filledJokerIds()).toEqual(["business-card", "plus-four-mult"]);
  });

  test("dragging a joker to the leftmost gap reorders it while a pack-pick is open", async () => {
    await reachPackPick();
    dragTileToGap("business-card", 0);
    expect(filledJokerIds()).toEqual(["business-card", "plus-four-mult"]);
  });

  test("the pack-pick stays open after reordering a joker", async () => {
    await reachPackPick();
    dragTileToGap("business-card", 0);
    expect(screen.getByTestId("pack-open-subtitle")).toBeInTheDocument();
  });

  test("dragging a joker to the deck still sells it while reorder is enabled (no drop-target conflict)", async () => {
    await reachShop();
    const tile = screen.getByTestId("joker-tile-filled-plus-four-mult");
    const deck = screen.getByRole("button", { name: /Deck/ });
    const dt = fakeDataTransfer();
    fireEvent.dragStart(tile, { dataTransfer: dt });
    fireEvent.dragOver(deck, { dataTransfer: dt });
    fireEvent.drop(deck, { dataTransfer: dt });
    fireEvent.dragEnd(tile, { dataTransfer: dt });
    expect(screen.queryByTestId("joker-tile-filled-plus-four-mult")).toBeNull();
  });

  test("an aborted drag (no drop) leaves the joker order unchanged during the shop", async () => {
    await reachShop();
    const tile = screen.getByTestId("joker-tile-filled-business-card");
    const dt = fakeDataTransfer();
    fireEvent.dragStart(tile, { dataTransfer: dt });
    fireEvent.dragEnd(tile, { dataTransfer: dt });
    expect(filledJokerIds()).toEqual(["plus-four-mult", "business-card"]);
  });
});
