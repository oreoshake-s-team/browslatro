import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Consumables from "./Consumables";
import { createPlanetCatalog } from "../../planets";
import { createTarotCatalog } from "../../tarots";
import type { Consumable } from "../../consumables";

const planet = createPlanetCatalog()[0];
const tarot = createTarotCatalog()[0];

function renderConsumables(
  overrides: Partial<Parameters<typeof Consumables>[0]> = {},
): ReturnType<typeof render> {
  return render(
    <Consumables consumables={[]} onUse={vi.fn()} {...overrides} />,
  );
}

describe("Consumables", () => {
  test("renders two empty slot buttons when empty", () => {
    renderConsumables();
    expect(screen.getAllByTestId("consumable-tile-empty")).toHaveLength(2);
  });

  test("empty slot buttons are disabled", () => {
    renderConsumables();
    expect(screen.getAllByTestId("consumable-tile-empty")[0]).toBeDisabled();
  });

  test("empty slot buttons have an accessible aria-label", () => {
    renderConsumables();
    expect(
      screen.getAllByRole("button", { name: "Empty consumable slot" }),
    ).toHaveLength(2);
  });

  test("renders one filled and one empty slot when half full", () => {
    const filled: Consumable = { kind: "planet", card: planet };
    renderConsumables({ consumables: [filled] });
    expect(screen.getByTestId("consumable-tile-filled-0")).toBeInTheDocument();
    expect(screen.getAllByTestId("consumable-tile-empty")).toHaveLength(1);
  });

  test("a planet tile carries data-consumable-kind=planet", () => {
    const filled: Consumable = { kind: "planet", card: planet };
    renderConsumables({ consumables: [filled] });
    expect(screen.getByTestId("consumable-tile-filled-0")).toHaveAttribute(
      "data-consumable-kind",
      "planet",
    );
  });

  test("a tarot tile carries data-consumable-kind=tarot", () => {
    const filled: Consumable = { kind: "tarot", card: tarot };
    renderConsumables({ consumables: [filled] });
    expect(screen.getByTestId("consumable-tile-filled-0")).toHaveAttribute(
      "data-consumable-kind",
      "tarot",
    );
  });

  test("a filled tile uses an action-oriented aria-label", () => {
    const filled: Consumable = { kind: "tarot", card: tarot };
    renderConsumables({ consumables: [filled] });
    expect(
      screen.getByRole("button", { name: `Use ${tarot.name} (tarot)` }),
    ).toBeInTheDocument();
  });

  test("renders no empty tiles when both slots full", () => {
    const filled: ReadonlyArray<Consumable> = [
      { kind: "planet", card: planet },
      { kind: "tarot", card: tarot },
    ];
    renderConsumables({ consumables: filled });
    expect(screen.queryAllByTestId("consumable-tile-empty")).toHaveLength(0);
  });

  test("clicking a filled tile invokes onUse with that index", async () => {
    const user = userEvent.setup();
    const onUse = vi.fn();
    const filled: ReadonlyArray<Consumable> = [
      { kind: "planet", card: planet },
      { kind: "tarot", card: tarot },
    ];
    renderConsumables({ consumables: filled, onUse });
    await user.click(screen.getByTestId("consumable-tile-filled-1"));
    expect(onUse).toHaveBeenCalledWith(1);
  });

  test("clicking an empty tile does not invoke onUse", async () => {
    const user = userEvent.setup();
    const onUse = vi.fn();
    renderConsumables({ onUse });
    await user.click(screen.getAllByTestId("consumable-tile-empty")[0]);
    expect(onUse).not.toHaveBeenCalled();
  });
});
