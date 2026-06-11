import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Consumables from "./Consumables";
import { createPlanetCatalog } from "../../items/planets";
import { createTarotCatalog } from "../../items/tarots";
import type { Consumable } from "../../items/consumables";

const planet = createPlanetCatalog()[0];
const tarot = createTarotCatalog()[0];

function renderConsumables(
  overrides: Partial<Parameters<typeof Consumables>[0]> = {},
): ReturnType<typeof render> {
  return render(
    <Consumables
      consumables={[]}
      selectedCount={0}
      onUse={vi.fn()}
      {...overrides}
    />,
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
      screen.getByRole("button", {
        name: new RegExp(`^Use ${tarot.name} \\(tarot\\)`),
      }),
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

  test("clicking a filled planet tile invokes onUse with that index", async () => {
    const user = userEvent.setup();
    const onUse = vi.fn();
    const filled: ReadonlyArray<Consumable> = [
      { kind: "planet", card: planet },
      { kind: "tarot", card: tarot },
    ];
    renderConsumables({ consumables: filled, onUse });
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    expect(onUse).toHaveBeenCalledWith(0);
  });

  test("clicking an enhancement-tarot tile invokes onUse when selection is valid", async () => {
    const user = userEvent.setup();
    const onUse = vi.fn();
    const filled: ReadonlyArray<Consumable> = [{ kind: "tarot", card: tarot }];
    renderConsumables({ consumables: filled, selectedCount: 1, onUse });
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    expect(onUse).toHaveBeenCalledWith(0);
  });

  test("an enhancement-tarot tile is disabled when no cards are selected", () => {
    const filled: ReadonlyArray<Consumable> = [{ kind: "tarot", card: tarot }];
    renderConsumables({ consumables: filled, selectedCount: 0 });
    expect(screen.getByTestId("consumable-tile-filled-0")).toBeDisabled();
  });

  test("an enhancement-tarot tile is disabled when too many cards are selected", () => {
    const filled: ReadonlyArray<Consumable> = [{ kind: "tarot", card: tarot }];
    renderConsumables({ consumables: filled, selectedCount: 5 });
    expect(screen.getByTestId("consumable-tile-filled-0")).toBeDisabled();
  });

  test("a disabled enhancement-tarot tile exposes a why-disabled tooltip", () => {
    const filled: ReadonlyArray<Consumable> = [{ kind: "tarot", card: tarot }];
    renderConsumables({ consumables: filled, selectedCount: 0 });
    expect(screen.getByTestId("consumable-tile-filled-0")).toHaveAttribute(
      "title",
      expect.stringMatching(/Select/),
    );
  });

  test("a planet tile is always enabled (no selection check)", () => {
    const filled: ReadonlyArray<Consumable> = [{ kind: "planet", card: planet }];
    renderConsumables({ consumables: filled, selectedCount: 0 });
    expect(screen.getByTestId("consumable-tile-filled-0")).not.toBeDisabled();
  });

  test("The Hermit tile is enabled regardless of selection", () => {
    const hermit = createTarotCatalog().find((t) => t.id === "the-hermit");
    if (!hermit) throw new Error("missing hermit");
    const filled: ReadonlyArray<Consumable> = [{ kind: "tarot", card: hermit }];
    renderConsumables({ consumables: filled, selectedCount: 0 });
    expect(screen.getByTestId("consumable-tile-filled-0")).not.toBeDisabled();
  });

  test("clicking an empty tile does not invoke onUse", async () => {
    const user = userEvent.setup();
    const onUse = vi.fn();
    renderConsumables({ onUse });
    await user.click(screen.getAllByTestId("consumable-tile-empty")[0]);
    expect(onUse).not.toHaveBeenCalled();
  });

  test("shift-click on a filled tile invokes onSell with that index", async () => {
    const user = userEvent.setup();
    const onSell = vi.fn();
    const onUse = vi.fn();
    const filled: ReadonlyArray<Consumable> = [{ kind: "planet", card: planet }];
    renderConsumables({ consumables: filled, onUse, onSell });
    await user.keyboard("{Shift>}");
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    await user.keyboard("{/Shift}");
    expect(onSell).toHaveBeenCalledWith(0);
  });

  test("shift-click on a filled tile does not also invoke onUse", async () => {
    const user = userEvent.setup();
    const onSell = vi.fn();
    const onUse = vi.fn();
    const filled: ReadonlyArray<Consumable> = [{ kind: "planet", card: planet }];
    renderConsumables({ consumables: filled, onUse, onSell });
    await user.keyboard("{Shift>}");
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    await user.keyboard("{/Shift}");
    expect(onUse).not.toHaveBeenCalled();
  });

  test("shift-click sells even when use is blocked by selection", async () => {
    const user = userEvent.setup();
    const onSell = vi.fn();
    const onUse = vi.fn();
    const filled: ReadonlyArray<Consumable> = [{ kind: "tarot", card: tarot }];
    renderConsumables({
      consumables: filled,
      selectedCount: 0,
      onUse,
      onSell,
    });
    await user.keyboard("{Shift>}");
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    await user.keyboard("{/Shift}");
    expect(onSell).toHaveBeenCalledWith(0);
  });

  test("plain click does not use a tile when selection is invalid", async () => {
    const user = userEvent.setup();
    const onUse = vi.fn();
    const filled: ReadonlyArray<Consumable> = [{ kind: "tarot", card: tarot }];
    renderConsumables({
      consumables: filled,
      selectedCount: 0,
      onUse,
      onSell: vi.fn(),
    });
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    expect(onUse).not.toHaveBeenCalled();
  });

  test("dragstart invokes onDragStart with the tile's index", () => {
    const onDragStart = vi.fn();
    const filled: ReadonlyArray<Consumable> = [{ kind: "planet", card: planet }];
    renderConsumables({ consumables: filled, onDragStart });
    const tile = screen.getByTestId("consumable-tile-filled-0");
    const event = new Event("dragstart", { bubbles: true });
    Object.defineProperty(event, "dataTransfer", {
      value: { setData: vi.fn(), effectAllowed: "" },
    });
    tile.dispatchEvent(event);
    expect(onDragStart).toHaveBeenCalledWith(0);
  });

  test("filled tiles are draggable", () => {
    const filled: ReadonlyArray<Consumable> = [{ kind: "planet", card: planet }];
    renderConsumables({ consumables: filled });
    expect(screen.getByTestId("consumable-tile-filled-0")).toHaveAttribute(
      "draggable",
      "true",
    );
  });
});

describe("Empty tray treatment", () => {
  test("the tray carries the consumables-tray-empty class when empty", () => {
    renderConsumables();
    expect(screen.getByTestId("consumables-tray")).toHaveClass("consumables-tray-empty");
  });

  test("negative: the tray drops the empty class once a consumable is held", () => {
    renderConsumables({ consumables: [{ kind: "tarot", card: tarot }] as Consumable[] });
    expect(screen.getByTestId("consumables-tray")).not.toHaveClass("consumables-tray-empty");
  });
});

describe("Consumables content overrides", () => {
  afterEach(async () => {
    const { restoreEnglishLocale } = await import("../../i18n/i18n.test-helpers");
    await restoreEnglishLocale();
  });

  test("a Mercury planet tile renders ʻUkali under the haw locale", async () => {
    const { default: i18n } = await import("../../i18n");
    await i18n.changeLanguage("haw");
    const mercury = createPlanetCatalog().find((p) => p.id === "mercury")!;
    const entry: Consumable = { kind: "planet", card: mercury };
    renderConsumables({ consumables: [entry] });
    expect(screen.getByText("ʻUkali")).toBeInTheDocument();
  });

  test("a tarot tile keeps its English name under the haw locale (negative)", async () => {
    const { default: i18n } = await import("../../i18n");
    await i18n.changeLanguage("haw");
    const entry: Consumable = { kind: "tarot", card: tarot };
    renderConsumables({ consumables: [entry] });
    expect(screen.getByText(tarot.name)).toBeInTheDocument();
  });
});
