import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PackOffer } from "./items/packs";
import {
  dismissBlindSelect,
  mockShuffleConfig,
  setupAppTestEnvironment,
} from "./App.test-helpers";


vi.mock("./cards/deck", async () => {
  const actual = await vi.importActual<typeof import("./cards/deck")>("./cards/deck");
  return {
    ...actual,
    shuffle: <T,>(items: ReadonlyArray<T>): T[] =>
      mockShuffleConfig.useIdentity ? items.slice() : actual.shuffle(items),
  };
});

let nextPack: PackOffer | null = null;

vi.mock("./items/packs", async () => {
  const actual = await vi.importActual<typeof import("./items/packs")>("./items/packs");
  return {
    ...actual,
    rollPack: () => {
      if (!nextPack) throw new Error("nextPack not configured");
      return nextPack;
    },
  };
});

import App from "./App";

setupAppTestEnvironment();

beforeEach(() => {
  nextPack = null;
});

function talismanMegaPack(): PackOffer {
  return {
    pool: "spectral",
    variant: "mega",
    options: [
      {
        kind: "spectral",
        spectral: {
          id: "talisman",
          name: "Talisman",
          description: "",
          effect: { kind: "apply-seal", seal: "gold", maxTargets: 1 },
        },
      },
      {
        kind: "spectral",
        spectral: {
          id: "black-hole",
          name: "Black Hole",
          description: "",
          effect: { kind: "black-hole" },
        },
      },
    ],
  };
}

async function ownTalismanWithPreview(): Promise<
  ReturnType<typeof userEvent.setup>
> {
  mockShuffleConfig.useIdentity = true;
  nextPack = talismanMegaPack();
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<App />);
  await user.click(screen.getByText(/Add \$10/));
  await user.click(screen.getByText(/^Win$/));
  await screen.findByTestId("shop-money");
  const packOffer = document.querySelector('[data-offer-kind="pack"]');
  const open = packOffer?.querySelector(
    "button.shop-offer-buy",
  ) as HTMLButtonElement;
  await user.click(open);
  await screen.findByTestId("pack-open-close");
  await user.click(screen.getByTestId("pack-open-pick-0"));
  return user;
}

function firstPreviewCard(): HTMLElement {
  const hand = screen.getByTestId("pack-open-preview-hand");
  const btn = hand.querySelector("button[aria-pressed]");
  if (!btn) throw new Error("no preview card button");
  return btn as HTMLElement;
}

describe("Applying owned apply-seal spectrals to the preview hand", () => {
  test("picking the apply-seal spectral puts it in the tray", async () => {
    await ownTalismanWithPreview();
    expect(screen.getByTestId("consumable-tile-filled-0")).toBeInTheDocument();
  });

  test("owned apply-seal spectral is use-disabled with no preview selection", async () => {
    await ownTalismanWithPreview();
    expect(screen.getByTestId("consumable-tile-filled-0")).toHaveAttribute(
      "data-use-disabled",
      "true",
    );
  });

  test("selecting a preview card then clicking the spectral empties the slot", async () => {
    const user = await ownTalismanWithPreview();
    await user.click(firstPreviewCard());
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    expect(
      screen.queryByTestId("consumable-tile-filled-0"),
    ).not.toBeInTheDocument();
  });

  test("applying the seal to the preview does not close the pack-pick", async () => {
    const user = await ownTalismanWithPreview();
    await user.click(firstPreviewCard());
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    expect(screen.getByTestId("pack-open-subtitle")).toBeInTheDocument();
  });

  test("the targeted preview card shows the seal after applying the spectral", async () => {
    const user = await ownTalismanWithPreview();
    await user.click(firstPreviewCard());
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    const sealed = screen
      .getByTestId("pack-open-preview-hand")
      .querySelector(".card-seal-gold");
    expect(sealed).not.toBeNull();
  });

  test("negative: clicking the spectral with no preview selection keeps the slot filled", async () => {
    const user = await ownTalismanWithPreview();
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    expect(screen.getByTestId("consumable-tile-filled-0")).toBeInTheDocument();
  });

  test("the applied seal persists into the next round's dealt hand", async () => {
    const user = await ownTalismanWithPreview();
    await user.click(firstPreviewCard());
    await user.click(screen.getByTestId("consumable-tile-filled-0"));
    await user.click(screen.getByTestId("pack-open-close"));
    await user.click(screen.getByRole("button", { name: /Next Round/ }));
    await dismissBlindSelect(user);
    const sealed = screen
      .getByTestId("hand-cards")
      .querySelector(".card-seal-gold");
    expect(sealed).not.toBeNull();
  });
});
