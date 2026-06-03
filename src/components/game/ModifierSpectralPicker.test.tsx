import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import ModifierSpectralPicker from "./ModifierSpectralPicker";
import { useGame } from "../../store/game";
import { createSpectralCatalog } from "../../items/spectrals";
import { MAX_CONSUMABLE_SLOTS } from "../../items/consumables";

const SPECTRALS = createSpectralCatalog();

async function openPicker(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.click(screen.getByText(/Add a specific Spectral/));
}

function buttonFor(id: string): HTMLButtonElement {
  const el = document.querySelector<HTMLButtonElement>(
    `button[data-spectral-id="${id}"]`,
  );
  if (!el) throw new Error(`No spectral button for ${id}`);
  return el;
}

describe("ModifierSpectralPicker", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("renders one button per spectral in the catalog", async () => {
    const user = userEvent.setup();
    render(<ModifierSpectralPicker />);
    await openPicker(user);
    expect(
      document.querySelectorAll("button[data-spectral-id]"),
    ).toHaveLength(SPECTRALS.length);
  });

  test("clicking Black Hole appends a Black Hole spectral to consumables", async () => {
    const user = userEvent.setup();
    render(<ModifierSpectralPicker />);
    await openPicker(user);
    await user.click(buttonFor("black-hole"));
    expect(useGame.getState().consumables).toEqual([
      expect.objectContaining({
        kind: "spectral",
        card: expect.objectContaining({ id: "black-hole" }),
      }),
    ]);
  });

  test("clicking a different spectral appends that one", async () => {
    const user = userEvent.setup();
    render(<ModifierSpectralPicker />);
    await openPicker(user);
    await user.click(buttonFor("soul"));
    expect(useGame.getState().consumables[0]).toMatchObject({
      kind: "spectral",
      card: expect.objectContaining({ id: "soul" }),
    });
  });

  test("buttons are disabled when the consumable tray is full (negative)", async () => {
    const user = userEvent.setup();
    const card = SPECTRALS[0];
    useGame.getState().setConsumables(
      Array.from({ length: MAX_CONSUMABLE_SLOTS }, () => ({
        kind: "spectral" as const,
        card,
      })),
    );
    render(<ModifierSpectralPicker />);
    await openPicker(user);
    expect(buttonFor("black-hole")).toBeDisabled();
  });

  test("clicking a button is a no-op when the consumable tray is full (negative)", async () => {
    const user = userEvent.setup();
    const card = SPECTRALS[0];
    useGame.getState().setConsumables(
      Array.from({ length: MAX_CONSUMABLE_SLOTS }, () => ({
        kind: "spectral" as const,
        card,
      })),
    );
    render(<ModifierSpectralPicker />);
    await openPicker(user);
    await user.click(buttonFor("soul"));
    expect(useGame.getState().consumables).toHaveLength(MAX_CONSUMABLE_SLOTS);
  });
});
