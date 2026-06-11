import { act, fireEvent, render, screen } from "@testing-library/react";
import App from "./App";
import { getStatValue, setupAppTestEnvironment } from "./App.test-helpers";
import { _resetBootShopForTests } from "./dev/bootShop";
import { createPlanetCatalog } from "./items/planets";
import { useGame } from "./store/game";

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

function dragConsumableTo(target: HTMLElement): void {
  const tile = screen.getByTestId("consumable-tile-filled-0");
  const dt = fakeDataTransfer();
  fireEvent.dragStart(tile, { dataTransfer: dt });
  fireEvent.dragOver(target, { dataTransfer: dt });
  fireEvent.drop(target, { dataTransfer: dt });
  fireEvent.dragEnd(tile, { dataTransfer: dt });
}

async function mountWithPlanetConsumable(): Promise<void> {
  window.localStorage.setItem("browslatro:bootShop", "1");
  render(<App />);
  await screen.findByTestId("shop-money");
  const planet = createPlanetCatalog()[0];
  act(() => {
    useGame.getState().setConsumables([{ kind: "planet", card: planet }]);
  });
  await screen.findByTestId("consumable-tile-filled-0");
}

describe("Consumable drag wiring", () => {
  beforeEach(() => {
    _resetBootShopForTests();
    window.localStorage.removeItem("browslatro:bootShop");
  });

  afterEach(() => {
    window.localStorage.removeItem("browslatro:bootShop");
  });

  test("dragging a consumable onto the deck pile sells it for $1 and empties the slot", async () => {
    await mountWithPlanetConsumable();
    const before = moneyOf();
    dragConsumableTo(screen.getByRole("button", { name: /Deck/ }));
    expect(moneyOf()).toBe(before + 1);
    expect(screen.queryByTestId("consumable-tile-filled-0")).toBeNull();
  });

  test("dragging a consumable onto the equipped-jokers area uses it without crediting the sell value", async () => {
    await mountWithPlanetConsumable();
    const before = moneyOf();
    dragConsumableTo(screen.getByTestId("jokers-tray"));
    expect(screen.queryByTestId("consumable-tile-filled-0")).toBeNull();
    expect(moneyOf()).toBe(before);
  });

  test("a drag that ends without a drop leaves the consumable and money untouched", async () => {
    await mountWithPlanetConsumable();
    const before = moneyOf();
    const tile = screen.getByTestId("consumable-tile-filled-0");
    const dt = fakeDataTransfer();
    fireEvent.dragStart(tile, { dataTransfer: dt });
    fireEvent.dragEnd(tile, { dataTransfer: dt });
    expect(screen.getByTestId("consumable-tile-filled-0")).toBeInTheDocument();
    expect(moneyOf()).toBe(before);
  });
});
