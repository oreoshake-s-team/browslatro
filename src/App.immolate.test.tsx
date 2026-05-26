import type { MockedFunction } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { play } from "./components/system/sounds";
import { shopPickerRngConfig, type ShopItem } from "./items/shop";

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
        id: "immolate",
        name: "Immolate",
        description: "Destroys 5 random cards in hand, gain $20",
        effect: {
          kind: "immolate" as const,
          destroyCount: actual.IMMOLATE_DESTROY_COUNT,
          moneyGain: actual.IMMOLATE_MONEY_GAIN,
        },
      },
    ],
  };
});

import App from "./App";

beforeEach(() => {
  playMock.mockClear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
  shopPickerRngConfig.rng = Math.random;
});

function getHandCardButtons(): HTMLElement[] {
  return Array.from(
    screen.getByLabelText("Your hand").querySelectorAll("button[aria-pressed]"),
  );
}

function flushDiscardAnimation(): void {
  for (let i = 0; i < 30; i += 1) {
    if (vi.getTimerCount() === 0) break;
    act(() => {
      vi.runOnlyPendingTimers();
    });
  }
  getHandCardButtons()
    .filter((btn) => btn.classList.contains("card-discarding"))
    .forEach((btn) => fireEvent.animationEnd(btn));
  for (let i = 0; i < 5; i += 1) {
    if (vi.getTimerCount() === 0) break;
    act(() => {
      vi.runOnlyPendingTimers();
    });
  }
}

async function getImmolateInConsumables(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  shopPickerRngConfig.rng = forceShopLayout(["spectral"]);
  await user.click(screen.getByText(/Add \$10/));
  await user.click(screen.getByText(/Win/));
  const buy = document
    .querySelector('[data-offer-kind="spectral"]')
    ?.querySelector("button.shop-offer-buy");
  if (!(buy instanceof HTMLButtonElement)) throw new Error("missing Immolate buy");
  await user.click(buy);
  await user.click(screen.getByRole("button", { name: /Next Round/ }));
}

describe("Immolate → discard refills hand to HAND_SIZE (#231)", () => {
  test("hand returns to 8 cards after discarding following Immolate", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await getImmolateInConsumables(user);
    expect(getHandCardButtons()).toHaveLength(8);
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    expect(getHandCardButtons()).toHaveLength(3);
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByText(/🗑️ Discard/));
    flushDiscardAnimation();
    expect(getHandCardButtons()).toHaveLength(8);
  });

  test("a normal discard with no destroy effect keeps the hand at 8 (negative)", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<App />);
    await user.click(getHandCardButtons()[0]);
    await user.click(screen.getByText(/🗑️ Discard/));
    flushDiscardAnimation();
    expect(getHandCardButtons()).toHaveLength(8);
  });
});
