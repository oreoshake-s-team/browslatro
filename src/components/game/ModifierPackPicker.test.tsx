import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import ModifierPackPicker from "./ModifierPackPicker";
import { useGame } from "../../store/game";

async function openPicker(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.click(screen.getByText(/Force a Pack pool in next shop/));
}

function buttonFor(id: string): HTMLButtonElement {
  const el = document.querySelector<HTMLButtonElement>(
    `button[data-pack-pool="${id}"]`,
  );
  if (!el) throw new Error(`No pack button for ${id}`);
  return el;
}

describe("ModifierPackPicker", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("renders one button per pack pool", async () => {
    const user = userEvent.setup();
    render(<ModifierPackPicker />);
    await openPicker(user);
    expect(
      document.querySelectorAll("button[data-pack-pool]"),
    ).toHaveLength(5);
  });

  test("clicking Standard appends 'standard' to pendingForcedPacks", async () => {
    const user = userEvent.setup();
    render(<ModifierPackPicker />);
    await openPicker(user);
    await user.click(buttonFor("standard"));
    expect(useGame.getState().pendingForcedPacks).toEqual(["standard"]);
  });

  test("clicking Arcana appends 'arcana' to pendingForcedPacks", async () => {
    const user = userEvent.setup();
    render(<ModifierPackPicker />);
    await openPicker(user);
    await user.click(buttonFor("arcana"));
    expect(useGame.getState().pendingForcedPacks).toEqual(["arcana"]);
  });

  test("clicking two buttons queues both pools in order", async () => {
    const user = userEvent.setup();
    render(<ModifierPackPicker />);
    await openPicker(user);
    await user.click(buttonFor("standard"));
    await user.click(buttonFor("buffoon"));
    expect(useGame.getState().pendingForcedPacks).toEqual([
      "standard",
      "buffoon",
    ]);
  });

  test("pendingForcedPacks starts empty (negative: no spontaneous queue)", () => {
    expect(useGame.getState().pendingForcedPacks).toEqual([]);
  });

  test("each pack-pool button exposes a data-testid for e2e selection", async () => {
    const user = userEvent.setup();
    render(<ModifierPackPicker />);
    await openPicker(user);
    expect(
      document.querySelectorAll('button[data-testid^="force-pack-"]'),
    ).toHaveLength(5);
  });
});
