import type { MockedFunction } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { play } from "./components/system/sounds";
import { shopPickerRngConfig, type ShopItem } from "./items/shop";
import { bossPickerRngConfig } from "./items/bosses";

vi.mock("./components/system/sounds", () => ({ play: vi.fn() }));

const playMock = play as MockedFunction<typeof play>;

type ShopOfferKind = Exclude<ShopItem["kind"], "pack">;

const KIND_TO_RNG: Record<ShopOfferKind, number> = {
  joker: 0.05,
  planet: 0.4,
  tarot: 0.75,
  spectral: 0,
};

function forceShopLayout(kinds: ReadonlyArray<ShopOfferKind>): () => number {
  let slotIdx = 0;
  let callsConsumed = 0;
  return () => {
    const target = kinds[slotIdx] ?? "joker";
    if (target === "spectral") {
      if (callsConsumed === 0) {
        callsConsumed = 1;
        return 0;
      }
      callsConsumed = 0;
      slotIdx += 1;
      return 0;
    }
    if (callsConsumed === 0) {
      callsConsumed = 1;
      return 0.99;
    }
    if (callsConsumed === 1) {
      callsConsumed = 2;
      return KIND_TO_RNG[target];
    }
    callsConsumed = 0;
    slotIdx += 1;
    return 0;
  };
}

vi.mock("./items/spectrals", async () => {
  const actual = await vi.importActual<typeof import("./items/spectrals")>(
    "./items/spectrals",
  );
  return {
    ...actual,
    createSpectralCatalog: () => [
      {
        id: "wraith",
        name: "Wraith",
        description: "Create a random Rare Joker, set money to $0",
        effect: {
          kind: "create-joker-by-rarity" as const,
          rarity: "rare" as const,
          setMoneyToZero: true,
        },
      },
    ],
  };
});

import App from "./App";

beforeEach(() => {
  playMock.mockClear();
  bossPickerRngConfig.rng = () => 0;
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
  shopPickerRngConfig.rng = Math.random;
  bossPickerRngConfig.rng = Math.random;
});

function moneyOf(): number {
  return Number(
    (screen.getByTestId("money-value").textContent ?? "0").replace(/[^0-9-]/g, ""),
  );
}

async function useWraith(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  shopPickerRngConfig.rng = forceShopLayout(["spectral"]);
  await user.click(screen.getByText(/Add \$10/));
  await user.click(screen.getByText(/^🏆 Win$/));
  const buy = document
    .querySelector('[data-offer-kind="spectral"]')
    ?.querySelector("button.shop-offer-buy");
  if (!(buy instanceof HTMLButtonElement)) throw new Error("missing Wraith buy");
  await user.click(buy);
  await user.click(screen.getByRole("button", { name: /Next Round/ }));
  const playBtn = screen.queryByTestId("blind-select-play");
  if (playBtn) await user.click(playBtn);
  await user.click(screen.getByTestId("consumable-tile-filled-0"));
}

describe("Wraith (#359)", () => {
  test("using Wraith creates a Rare Joker (Baron) in the equipped row", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await useWraith(user);
    expect(screen.getByTestId("joker-tile-filled-baron")).toBeInTheDocument();
  });

  test("using Wraith sets money to $0", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await useWraith(user);
    expect(moneyOf()).toBe(0);
  });

  test("using Wraith leaves no spectral in the consumable tray", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await useWraith(user);
    expect(screen.queryByTestId("consumable-tile-filled-0")).not.toBeInTheDocument();
  });
});
