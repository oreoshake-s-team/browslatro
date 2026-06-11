import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import ModifierPanel from "./ModifierPanel";
import { humanPlayLog } from "../../ai/humanPlayWiring";
import { useGame } from "../../store/game";

async function openModifiers(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  await user.click(screen.getByText(/Apply modifiers/));
}

describe("ModifierPanel", () => {
  beforeEach(() => {
    window.localStorage.clear();
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
    await user.click(screen.getByText(/^Win$/));
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

  test("Ante +1 button increments ante by 1 (closes #844)", async () => {
    const user = userEvent.setup();
    render(<ModifierPanel />);
    await openModifiers(user);
    act(() => useGame.getState().setAnte(3));
    await user.click(screen.getByText(/Ante \+1/));
    expect(useGame.getState().ante).toBe(4);
  });

  test("Ante −1 button decrements ante by 1 (closes #844)", async () => {
    const user = userEvent.setup();
    render(<ModifierPanel />);
    await openModifiers(user);
    act(() => useGame.getState().setAnte(4));
    await user.click(screen.getByText(/Ante −1/));
    expect(useGame.getState().ante).toBe(3);
  });

  test("Ante +1 is disabled on the final ante (negative — closes #844)", async () => {
    const user = userEvent.setup();
    render(<ModifierPanel />);
    await openModifiers(user);
    act(() => useGame.getState().setAnte(8));
    expect(screen.getByText(/Ante \+1/)).toBeDisabled();
  });

  test("Ante −1 is disabled on ante 1 (negative — closes #844)", async () => {
    const user = userEvent.setup();
    render(<ModifierPanel />);
    await openModifiers(user);
    act(() => useGame.getState().setAnte(1));
    expect(screen.getByText(/Ante −1/)).toBeDisabled();
  });

  test("Force Probabilities toggles the flag", async () => {
    const user = userEvent.setup();
    render(<ModifierPanel />);
    await openModifiers(user);
    const before = useGame.getState().forceProbabilities;
    await user.click(screen.getByText(/Force Probabilities/));
    expect(useGame.getState().forceProbabilities).toBe(!before);
  });

  test("renders ModifierSpectralPicker subcomponent", () => {
    render(<ModifierPanel />);
    expect(screen.getByText(/Add a specific Spectral/)).toBeInTheDocument();
  });

  test("renders ModifierTarotPicker subcomponent", () => {
    render(<ModifierPanel />);
    expect(screen.getByText(/Add a specific Tarot/)).toBeInTheDocument();
  });

  test("renders ModifierPlanetPicker subcomponent", () => {
    render(<ModifierPanel />);
    expect(screen.getByText(/Add a specific Planet/)).toBeInTheDocument();
  });

  test.each([
    "Add Arcana pack",
    "Add Celestial pack",
    "Add Standard pack",
    "Add Spectral pack",
    "Clear pending packs",
    "Packs +1",
    "Packs −1",
    "Vouchers +1",
    "Vouchers −1",
  ])(
    "%s is no longer rendered in the modifier panel (closes #634)",
    async (label) => {
      const user = userEvent.setup();
      render(<ModifierPanel />);
      await openModifiers(user);
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    },
  );
});

describe("ModifierPanel human play log", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useGame.getState().resetGame();
  });

  function seedOneRecord(): void {
    window.localStorage.setItem(
      "browslatro.human-play-log.v1",
      '{"schema":1}',
    );
  }

  test("shows the recorded decision count", async () => {
    seedOneRecord();
    const user = userEvent.setup();
    render(<ModifierPanel />);
    await openModifiers(user);
    expect(screen.getByTestId("human-play-log-count")).toHaveTextContent(
      "1 recorded decision",
    );
  });

  test("disables export and clear when the log is empty", async () => {
    const user = userEvent.setup();
    render(<ModifierPanel />);
    await openModifiers(user);
    expect(
      screen.getByRole("button", { name: /Export log/ }),
    ).toBeDisabled();
  });

  test("clear empties the log", async () => {
    seedOneRecord();
    const user = userEvent.setup();
    render(<ModifierPanel />);
    await openModifiers(user);
    await user.click(screen.getByRole("button", { name: /Clear log/ }));
    expect(humanPlayLog().count()).toBe(0);
  });

  test("clear resets the visible count", async () => {
    seedOneRecord();
    const user = userEvent.setup();
    render(<ModifierPanel />);
    await openModifiers(user);
    await user.click(screen.getByRole("button", { name: /Clear log/ }));
    expect(screen.getByTestId("human-play-log-count")).toHaveTextContent(
      "0 recorded decisions",
    );
  });

  test("export downloads the JSONL via an object URL", async () => {
    seedOneRecord();
    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });
    const user = userEvent.setup();
    render(<ModifierPanel />);
    await openModifiers(user);
    await user.click(screen.getByRole("button", { name: /Export log/ }));
    vi.unstubAllGlobals();
    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });
});
