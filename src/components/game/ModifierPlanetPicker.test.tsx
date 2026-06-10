import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import ModifierPlanetPicker from "./ModifierPlanetPicker";
import { useGame } from "../../store/game";
import { createPlanetCatalog } from "../../items/planets";
import { MAX_CONSUMABLE_SLOTS } from "../../items/consumables";
import { sortByDisplayName } from "./displayNameSort";

const PLANETS = createPlanetCatalog();

async function openPicker(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.click(screen.getByText(/Add a specific Planet/));
}

function buttonFor(id: string): HTMLButtonElement {
  const el = document.querySelector<HTMLButtonElement>(
    `button[data-planet-id="${id}"]`,
  );
  if (!el) throw new Error(`No planet button for ${id}`);
  return el;
}

describe("ModifierPlanetPicker", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("renders one button per planet in the catalog", async () => {
    const user = userEvent.setup();
    render(<ModifierPlanetPicker />);
    await openPicker(user);
    expect(
      document.querySelectorAll("button[data-planet-id]"),
    ).toHaveLength(PLANETS.length);
  });

  test("renders planets alphabetically by name", async () => {
    const user = userEvent.setup();
    render(<ModifierPlanetPicker />);
    await openPicker(user);
    const ids = Array.from(
      document.querySelectorAll("button[data-planet-id]"),
    ).map((el) => el.getAttribute("data-planet-id"));
    expect(ids).toEqual(
      sortByDisplayName(PLANETS, (c) => c.name).map((c) => c.id),
    );
  });

  test("clicking Pluto appends a Pluto planet to consumables", async () => {
    const user = userEvent.setup();
    render(<ModifierPlanetPicker />);
    await openPicker(user);
    await user.click(buttonFor("pluto"));
    expect(useGame.getState().consumables).toEqual([
      expect.objectContaining({
        kind: "planet",
        card: expect.objectContaining({ id: "pluto" }),
      }),
    ]);
  });

  test("clicking a different planet appends that one", async () => {
    const user = userEvent.setup();
    render(<ModifierPlanetPicker />);
    await openPicker(user);
    await user.click(buttonFor("saturn"));
    expect(useGame.getState().consumables[0]).toMatchObject({
      kind: "planet",
      card: expect.objectContaining({ id: "saturn" }),
    });
  });

  test("buttons are disabled when the consumable tray is full (negative)", async () => {
    const user = userEvent.setup();
    const card = PLANETS[0];
    useGame.getState().setConsumables(
      Array.from({ length: MAX_CONSUMABLE_SLOTS }, () => ({
        kind: "planet" as const,
        card,
      })),
    );
    render(<ModifierPlanetPicker />);
    await openPicker(user);
    expect(buttonFor("pluto")).toBeDisabled();
  });

  test("clicking a button is a no-op when the consumable tray is full (negative)", async () => {
    const user = userEvent.setup();
    const card = PLANETS[0];
    useGame.getState().setConsumables(
      Array.from({ length: MAX_CONSUMABLE_SLOTS }, () => ({
        kind: "planet" as const,
        card,
      })),
    );
    render(<ModifierPlanetPicker />);
    await openPicker(user);
    await user.click(buttonFor("saturn"));
    expect(useGame.getState().consumables).toHaveLength(MAX_CONSUMABLE_SLOTS);
  });

  test("hovering a button opens a tooltip with the planet's name", async () => {
    const user = userEvent.setup();
    render(<ModifierPlanetPicker />);
    await openPicker(user);
    await user.hover(buttonFor("saturn"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Saturn");
  });

  test("hovering a button shows the planet's effect description in the tooltip", async () => {
    const user = userEvent.setup();
    const pluto = PLANETS.find((p) => p.id === "pluto");
    if (!pluto) throw new Error("missing pluto planet");
    render(<ModifierPlanetPicker />);
    await openPicker(user);
    await user.hover(buttonFor("pluto"));
    expect(screen.getByRole("tooltip")).toHaveTextContent(pluto.description);
  });

  test("the tooltip closes when the pointer leaves the button", async () => {
    const user = userEvent.setup();
    render(<ModifierPlanetPicker />);
    await openPicker(user);
    const btn = buttonFor("saturn");
    await user.hover(btn);
    await user.unhover(btn);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  test("focusing a button via keyboard opens the tooltip", async () => {
    const user = userEvent.setup();
    render(<ModifierPlanetPicker />);
    await openPicker(user);
    fireEvent.focus(buttonFor("jupiter"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Jupiter");
  });

  test("pressing Escape closes the tooltip", async () => {
    const user = userEvent.setup();
    render(<ModifierPlanetPicker />);
    await openPicker(user);
    await user.hover(buttonFor("saturn"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
