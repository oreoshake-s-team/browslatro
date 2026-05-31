import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import ModifierPanel from "./ModifierPanel";
import { useGame } from "../../store/game";

async function openModifiers(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.click(screen.getByText(/Apply modifiers/));
}

describe("ModifierPanel", () => {
  beforeEach(() => {
    useGame.getState().resetGame();
  });

  test("Add Chips button bumps devChipsBonus by 10", async () => {
    const user = userEvent.setup();
    render(<ModifierPanel />);
    await openModifiers(user);
    const before = useGame.getState().devChipsBonus;
    await user.click(screen.getByText(/Add Chips/));
    expect(useGame.getState().devChipsBonus).toBe(before + 10);
  });

  test("Add Multiplier button bumps devMultBonus by 1", async () => {
    const user = userEvent.setup();
    render(<ModifierPanel />);
    await openModifiers(user);
    const before = useGame.getState().devMultBonus;
    await user.click(screen.getByText(/Add Multiplier/));
    expect(useGame.getState().devMultBonus).toBe(before + 1);
  });

  test("Multiply Multiplier button doubles devMultFactor", async () => {
    const user = userEvent.setup();
    render(<ModifierPanel />);
    await openModifiers(user);
    const before = useGame.getState().devMultFactor;
    await user.click(screen.getByText(/Multiply Multiplier/));
    expect(useGame.getState().devMultFactor).toBe(before * 2);
  });

  test("Win button advances the round", async () => {
    const user = userEvent.setup();
    render(<ModifierPanel />);
    await openModifiers(user);
    const before = useGame.getState().round;
    await user.click(screen.getByText(/^🏆 Win$/));
    expect(useGame.getState().round).toBe(before + 1);
  });

  test("Add $10 button increases money by 10", async () => {
    const user = userEvent.setup();
    useGame.setState({ money: 5 });
    render(<ModifierPanel />);
    await openModifiers(user);
    await user.click(screen.getByText(/Add \$10/));
    expect(useGame.getState().money).toBe(15);
  });

  test("Subtract $10 button decreases money by 10", async () => {
    const user = userEvent.setup();
    useGame.setState({ money: 25 });
    render(<ModifierPanel />);
    await openModifiers(user);
    await user.click(screen.getByText(/Subtract \$10/));
    expect(useGame.getState().money).toBe(15);
  });

  test("Hand −1 button decrements handSizeModifier", async () => {
    const user = userEvent.setup();
    render(<ModifierPanel />);
    await openModifiers(user);
    const before = useGame.getState().handSizeModifier;
    await user.click(screen.getByText(/Hand −1/));
    expect(useGame.getState().handSizeModifier).toBe(before - 1);
  });

  test("Hand +1 button increments handSizeModifier", async () => {
    const user = userEvent.setup();
    render(<ModifierPanel />);
    await openModifiers(user);
    const before = useGame.getState().handSizeModifier;
    await user.click(screen.getByText(/Hand \+1/));
    expect(useGame.getState().handSizeModifier).toBe(before + 1);
  });

  test("Packs +1 button increments extraPackSlots", async () => {
    const user = userEvent.setup();
    render(<ModifierPanel />);
    await openModifiers(user);
    const before = useGame.getState().extraPackSlots;
    await user.click(screen.getByText(/Packs \+1/));
    expect(useGame.getState().extraPackSlots).toBe(before + 1);
  });

  test("Add Standard pack queues a forced standard pack", async () => {
    const user = userEvent.setup();
    render(<ModifierPanel />);
    await openModifiers(user);
    await user.click(screen.getByText(/Add Standard pack/));
    expect(useGame.getState().pendingForcedPacks).toContain("standard");
  });

  test("Clear pending packs empties the queue", async () => {
    const user = userEvent.setup();
    useGame.getState().setPendingForcedPacks(["standard", "celestial"]);
    render(<ModifierPanel />);
    await openModifiers(user);
    await user.click(screen.getByText(/Clear pending packs/));
    expect(useGame.getState().pendingForcedPacks).toEqual([]);
  });

  test("Clear pending packs is disabled when no packs are queued (negative)", async () => {
    const user = userEvent.setup();
    render(<ModifierPanel />);
    await openModifiers(user);
    expect(screen.getByText(/Clear pending packs/)).toBeDisabled();
  });

  test("Force Probabilities toggles the flag", async () => {
    const user = userEvent.setup();
    render(<ModifierPanel />);
    await openModifiers(user);
    const before = useGame.getState().forceProbabilities;
    await user.click(screen.getByText(/Force Probabilities/));
    expect(useGame.getState().forceProbabilities).toBe(!before);
  });

  test("Vouchers +1 increases extraVoucherSlots by 1", async () => {
    const user = userEvent.setup();
    render(<ModifierPanel />);
    await openModifiers(user);
    const before = useGame.getState().extraVoucherSlots;
    await user.click(screen.getByText(/Vouchers \+1/));
    expect(useGame.getState().extraVoucherSlots).toBe(before + 1);
  });
});
