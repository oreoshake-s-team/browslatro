import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import { forceShopLayout, shopPickerRngConfig } from "./items/shop";
import {
  createBusinessCardJoker,
  createPlusFourMultJoker,
  initialJokersConfig,
} from "./items/jokers";
import {
  dismissBlindSelect,
  flushDiscardAnimation,
  getHandCardButtons,
  getStatValue,
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
    createDeck: () => {
      const deck = actual.createDeck();
      if (!mockDeckConfig.useDefaultEnhancements) return deck;
      return deck.map((c) => ({
        ...c,
        enhancement: actual.defaultEnhancementForRank(c.rank),
      }));
    },
  };
});

setupAppTestEnvironment();

function moneyOf(): number {
  return Number(
    getStatValue("Money").textContent?.replace(/[^0-9-]/g, "") ?? "0",
  );
}

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

async function openPackOffer(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  const offers = screen.getAllByTestId(/^shop-offer-/);
  const packIdx = offers.findIndex(
    (el) => el.getAttribute("data-offer-kind") === "pack",
  );
  const openBtn = offers[packIdx].querySelector(
    "button.shop-offer-buy",
  ) as HTMLButtonElement;
  await user.click(openBtn);
  await screen.findByTestId("pack-open-close");
}

describe("Selling and using during a pack-pick (#388)", () => {
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

  async function reachShop(
    kinds?: ReadonlyArray<"joker" | "planet" | "tarot" | "spectral">,
  ): Promise<ReturnType<typeof userEvent.setup>> {
    mockShuffleConfig.useIdentity = true;
    if (kinds) shopPickerRngConfig.rng = forceShopLayout(kinds);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(screen.getByText(/Add \$10/));
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(await screen.findByRole("button", { name: /Continue/ }));
    return user;
  }

  async function reachPackPick(): Promise<ReturnType<typeof userEvent.setup>> {
    const user = await reachShop();
    await openPackOffer(user);
    return user;
  }

  async function buyOfferedConsumable(
    user: ReturnType<typeof userEvent.setup>,
    kind: "planet" | "tarot",
  ): Promise<void> {
    const offers = screen.getAllByTestId(/^shop-offer-/);
    const idx = offers.findIndex(
      (el) => el.getAttribute("data-offer-kind") === kind,
    );
    const buy = offers[idx].querySelector(
      "button.shop-offer-buy",
    ) as HTMLButtonElement;
    await user.click(buy);
  }

  test("shift-clicking a joker mid-pack-pick increases money", async () => {
    await reachPackPick();
    const before = moneyOf();
    fireEvent.click(screen.getByTestId("joker-tile-filled-plus-four-mult"), {
      shiftKey: true,
    });
    expect(moneyOf()).toBe(before + 2);
  });

  test("shift-clicking a joker mid-pack-pick removes the tile", async () => {
    await reachPackPick();
    fireEvent.click(screen.getByTestId("joker-tile-filled-business-card"), {
      shiftKey: true,
    });
    expect(screen.queryByTestId("joker-tile-filled-business-card")).toBeNull();
  });

  test("the pack-pick stays open after selling a joker", async () => {
    await reachPackPick();
    fireEvent.click(screen.getByTestId("joker-tile-filled-plus-four-mult"), {
      shiftKey: true,
    });
    expect(screen.getByTestId("pack-open-subtitle")).toBeInTheDocument();
  });

  test("a deck drop target is rendered while a pack-pick is open", async () => {
    await reachPackPick();
    expect(screen.getByRole("button", { name: /Deck/ })).toBeInTheDocument();
  });

  test("dragging a joker onto the deck mid-pack-pick sells it for money", async () => {
    await reachPackPick();
    const before = moneyOf();
    const tile = screen.getByTestId("joker-tile-filled-plus-four-mult");
    const deck = screen.getByRole("button", { name: /Deck/ });
    const dt = fakeDataTransfer();
    fireEvent.dragStart(tile, { dataTransfer: dt });
    fireEvent.dragOver(deck, { dataTransfer: dt });
    fireEvent.drop(deck, { dataTransfer: dt });
    fireEvent.dragEnd(tile, { dataTransfer: dt });
    expect(moneyOf()).toBe(before + 2);
  });

  test("dragging a joker onto the deck mid-pack-pick removes the tile", async () => {
    await reachPackPick();
    const tile = screen.getByTestId("joker-tile-filled-business-card");
    const deck = screen.getByRole("button", { name: /Deck/ });
    const dt = fakeDataTransfer();
    fireEvent.dragStart(tile, { dataTransfer: dt });
    fireEvent.dragOver(deck, { dataTransfer: dt });
    fireEvent.drop(deck, { dataTransfer: dt });
    fireEvent.dragEnd(tile, { dataTransfer: dt });
    expect(
      screen.queryByTestId("joker-tile-filled-business-card"),
    ).toBeNull();
  });

  test("dragging a joker but ending without a deck drop leaves it in place", async () => {
    await reachPackPick();
    const tile = screen.getByTestId("joker-tile-filled-business-card");
    const dt = fakeDataTransfer();
    fireEvent.dragStart(tile, { dataTransfer: dt });
    fireEvent.dragEnd(tile, { dataTransfer: dt });
    expect(
      screen.getByTestId("joker-tile-filled-business-card"),
    ).toBeInTheDocument();
  });

  test("dragging a consumable onto the deck mid-pack-pick sells it", async () => {
    const user = await reachShop(["tarot", "joker"]);
    await buyOfferedConsumable(user, "tarot");
    await openPackOffer(user);
    const before = moneyOf();
    const tile = screen.getByTestId("consumable-tile-filled-0");
    const deck = screen.getByRole("button", { name: /Deck/ });
    const dt = fakeDataTransfer();
    fireEvent.dragStart(tile, { dataTransfer: dt });
    fireEvent.dragOver(deck, { dataTransfer: dt });
    fireEvent.drop(deck, { dataTransfer: dt });
    fireEvent.dragEnd(tile, { dataTransfer: dt });
    expect(moneyOf()).toBeGreaterThan(before);
  });

  test("shift-clicking a consumable mid-pack-pick sells it", async () => {
    const user = await reachShop(["tarot", "joker"]);
    await buyOfferedConsumable(user, "tarot");
    await openPackOffer(user);
    const before = moneyOf();
    fireEvent.click(screen.getByTestId("consumable-tile-filled-0"), {
      shiftKey: true,
    });
    expect(moneyOf()).toBeGreaterThan(before);
  });

  test("using a planet consumable mid-pack-pick empties its slot", async () => {
    const user = await reachShop(["planet", "joker"]);
    await buyOfferedConsumable(user, "planet");
    await openPackOffer(user);
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    expect(
      screen.queryByTestId("consumable-tile-filled-0"),
    ).not.toBeInTheDocument();
  });

  test("using a planet consumable mid-pack-pick does not close the pack-pick", async () => {
    const user = await reachShop(["planet", "joker"]);
    await buyOfferedConsumable(user, "planet");
    await openPackOffer(user);
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    expect(screen.getByTestId("pack-open-subtitle")).toBeInTheDocument();
  });
});

describe("Drag-to-deck sell while the shop is open (#388)", () => {
  const originalFactory = initialJokersConfig.factory;

  beforeEach(() => {
    initialJokersConfig.factory = () => [createPlusFourMultJoker()];
  });

  afterEach(() => {
    initialJokersConfig.factory = originalFactory;
  });

  async function reachShop(): Promise<ReturnType<typeof userEvent.setup>> {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    const cards = getHandCardButtons();
    for (let i = 0; i < 5; i += 1) await user.click(cards[i]);
    await user.click(screen.getByText(/Submit Hand/));
    flushDiscardAnimation();
    await user.click(await screen.findByRole("button", { name: /Continue/ }));
    return user;
  }

  test("dragging a joker onto the deck during the shop sells it", async () => {
    await reachShop();
    const before = moneyOf();
    const tile = screen.getByTestId("joker-tile-filled-plus-four-mult");
    const deck = screen.getByRole("button", { name: /Deck/ });
    const dt = fakeDataTransfer();
    fireEvent.dragStart(tile, { dataTransfer: dt });
    fireEvent.dragOver(deck, { dataTransfer: dt });
    fireEvent.drop(deck, { dataTransfer: dt });
    fireEvent.dragEnd(tile, { dataTransfer: dt });
    expect(moneyOf()).toBe(before + 2);
  });
});

describe("No overlay deck target during normal play (#388)", () => {
  test("the overlay deck-drop target is absent while the hand is visible", async () => {
    mockShuffleConfig.useIdentity = true;
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await dismissBlindSelect(user);
    expect(document.querySelector(".game-overlay-deck")).toBeNull();
  });
});
