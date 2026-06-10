import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import ModifierTarotPicker from "./ModifierTarotPicker";
import { useGame } from "../../store/game";
import { createTarotCatalog } from "../../items/tarots";
import { MAX_CONSUMABLE_SLOTS } from "../../items/consumables";
import { sortByDisplayName } from "./displayNameSort";

const TAROTS = createTarotCatalog();

async function openPicker(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.click(screen.getByText(/Add a specific Tarot/));
}

function buttonFor(id: string): HTMLButtonElement {
  const el = document.querySelector<HTMLButtonElement>(
    `button[data-tarot-id="${id}"]`,
  );
  if (!el) throw new Error(`No tarot button for ${id}`);
  return el;
}

describe("ModifierTarotPicker", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("renders one button per tarot in the catalog", async () => {
    const user = userEvent.setup();
    render(<ModifierTarotPicker />);
    await openPicker(user);
    expect(
      document.querySelectorAll("button[data-tarot-id]"),
    ).toHaveLength(TAROTS.length);
  });

  test("renders tarots alphabetically ignoring a leading 'The '", async () => {
    const user = userEvent.setup();
    render(<ModifierTarotPicker />);
    await openPicker(user);
    const ids = Array.from(
      document.querySelectorAll("button[data-tarot-id]"),
    ).map((el) => el.getAttribute("data-tarot-id"));
    expect(ids).toEqual(
      sortByDisplayName(TAROTS, (c) => c.name).map((c) => c.id),
    );
  });

  test("clicking The Magician appends a The Magician tarot to consumables", async () => {
    const user = userEvent.setup();
    render(<ModifierTarotPicker />);
    await openPicker(user);
    await user.click(buttonFor("the-magician"));
    expect(useGame.getState().consumables).toEqual([
      expect.objectContaining({
        kind: "tarot",
        card: expect.objectContaining({ id: "the-magician" }),
      }),
    ]);
  });

  test("clicking a different tarot appends that one", async () => {
    const user = userEvent.setup();
    render(<ModifierTarotPicker />);
    await openPicker(user);
    await user.click(buttonFor("the-hermit"));
    expect(useGame.getState().consumables[0]).toMatchObject({
      kind: "tarot",
      card: expect.objectContaining({ id: "the-hermit" }),
    });
  });

  test("buttons are disabled when the consumable tray is full (negative)", async () => {
    const user = userEvent.setup();
    const card = TAROTS[0];
    useGame.getState().setConsumables(
      Array.from({ length: MAX_CONSUMABLE_SLOTS }, () => ({
        kind: "tarot" as const,
        card,
      })),
    );
    render(<ModifierTarotPicker />);
    await openPicker(user);
    expect(buttonFor("the-magician")).toBeDisabled();
  });

  test("clicking a button is a no-op when the consumable tray is full (negative)", async () => {
    const user = userEvent.setup();
    const card = TAROTS[0];
    useGame.getState().setConsumables(
      Array.from({ length: MAX_CONSUMABLE_SLOTS }, () => ({
        kind: "tarot" as const,
        card,
      })),
    );
    render(<ModifierTarotPicker />);
    await openPicker(user);
    await user.click(buttonFor("the-hermit"));
    expect(useGame.getState().consumables).toHaveLength(MAX_CONSUMABLE_SLOTS);
  });

  test("hovering a button opens a tooltip with the tarot's name", async () => {
    const user = userEvent.setup();
    render(<ModifierTarotPicker />);
    await openPicker(user);
    await user.hover(buttonFor("the-hermit"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("The Hermit");
  });

  test("hovering a button shows the tarot's effect description in the tooltip", async () => {
    const user = userEvent.setup();
    const magician = TAROTS.find((t) => t.id === "the-magician");
    if (!magician) throw new Error("missing the-magician tarot");
    render(<ModifierTarotPicker />);
    await openPicker(user);
    await user.hover(buttonFor("the-magician"));
    expect(screen.getByRole("tooltip")).toHaveTextContent(magician.description);
  });

  test("the tooltip closes when the pointer leaves the button", async () => {
    const user = userEvent.setup();
    render(<ModifierTarotPicker />);
    await openPicker(user);
    const btn = buttonFor("the-hermit");
    await user.hover(btn);
    await user.unhover(btn);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  test("focusing a button via keyboard opens the tooltip", async () => {
    const user = userEvent.setup();
    render(<ModifierTarotPicker />);
    await openPicker(user);
    fireEvent.focus(buttonFor("the-empress"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("The Empress");
  });

  test("pressing Escape closes the tooltip", async () => {
    const user = userEvent.setup();
    render(<ModifierTarotPicker />);
    await openPicker(user);
    await user.hover(buttonFor("the-hermit"));
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
