import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PackOffer } from "./items/packs";
import { HANDS } from "./constants";
import { getStatValue, setupAppTestEnvironment } from "./App.test-helpers";

vi.mock("./components/system/sounds", () => ({ play: vi.fn() }));

let nextSpectralPack: PackOffer | null = null;

vi.mock("./items/packs", async () => {
  const actual = await vi.importActual<typeof import("./items/packs")>(
    "./items/packs",
  );
  return {
    ...actual,
    rollPack: () => {
      if (!nextSpectralPack) throw new Error("nextSpectralPack not configured");
      return nextSpectralPack;
    },
  };
});

import App from "./App";
import {
  FAMILIAR_ADD_COUNT,
  IMMOLATE_DESTROY_COUNT,
  IMMOLATE_MONEY_GAIN,
} from "./items/spectrals";

setupAppTestEnvironment();

beforeEach(() => {
  nextSpectralPack = null;
});

function spectralPack(spectralId: string): PackOffer {
  const spec = {
    "black-hole": { name: "Black Hole", effect: { kind: "black-hole" as const } },
    immolate: {
      name: "Immolate",
      effect: {
        kind: "immolate" as const,
        destroyCount: IMMOLATE_DESTROY_COUNT,
        moneyGain: IMMOLATE_MONEY_GAIN,
      },
    },
    sigil: { name: "Sigil", effect: { kind: "sigil" as const } },
    familiar: {
      name: "Familiar",
      effect: {
        kind: "transmute" as const,
        rankFilter: "face" as const,
        addCount: FAMILIAR_ADD_COUNT,
      },
    },
    talisman: {
      name: "Talisman",
      effect: {
        kind: "apply-seal" as const,
        seal: "gold" as const,
        maxTargets: 1 as const,
      },
    },
  }[spectralId];
  if (!spec) throw new Error(`Unknown test spectral ${spectralId}`);
  return {
    pool: "spectral",
    variant: "normal",
    options: [
      {
        kind: "spectral",
        spectral: {
          id: spectralId,
          name: spec.name,
          description: "",
          effect: spec.effect,
        },
      },
    ],
  };
}

async function openSpectralPack(
  spectralId: string,
): Promise<ReturnType<typeof userEvent.setup>> {
  nextSpectralPack = spectralPack(spectralId);
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  render(<App />);
  await user.click(screen.getByText(/Add \$10/));
  await user.click(screen.getByText(/^Win$/));
  const packOffer = document.querySelector('[data-offer-kind="pack"]');
  const open = packOffer?.querySelector(
    "button.shop-offer-buy",
  ) as HTMLButtonElement;
  await user.click(open);
  await screen.findByTestId("pack-open-close");
  return user;
}

function moneyOf(): number {
  return Number(
    getStatValue("Money").textContent?.replace(/[^0-9-]/g, "") ?? "0",
  );
}

function consumableTilesCount(): number {
  return screen.queryAllByTestId(/^consumable-tile-filled-/).length;
}

describe("inline spectral pack-picks (closes #367)", () => {
  test("Black Hole pulled from pack upgrades every poker hand level", async () => {
    const user = await openSpectralPack("black-hole");
    await user.click(screen.getByTestId("pack-open-pick-0"));
    await user.click(screen.getByRole("button", { name: "Run info" }));
    await screen.findByRole("dialog", { name: "Run Information" });
    const levels = HANDS.map((h) =>
      Number(
        screen.getByTestId(`run-info-level-${h.label}`).textContent ?? "1",
      ),
    );
    expect(levels.every((lvl) => lvl > 1)).toBe(true);
  });

  test("Black Hole pulled from pack does not consume a tray slot", async () => {
    const user = await openSpectralPack("black-hole");
    const before = consumableTilesCount();
    await user.click(screen.getByTestId("pack-open-pick-0"));
    expect(consumableTilesCount()).toBe(before);
  });

  test("Immolate pulled from pack grants money immediately", async () => {
    const user = await openSpectralPack("immolate");
    const before = moneyOf();
    await user.click(screen.getByTestId("pack-open-pick-0"));
    expect(moneyOf()).toBe(before + IMMOLATE_MONEY_GAIN);
  });

  test("Immolate pulled from pack does not consume a tray slot", async () => {
    const user = await openSpectralPack("immolate");
    const before = consumableTilesCount();
    await user.click(screen.getByTestId("pack-open-pick-0"));
    expect(consumableTilesCount()).toBe(before);
  });

  test("Sigil pulled from pack does not consume a tray slot", async () => {
    const user = await openSpectralPack("sigil");
    const before = consumableTilesCount();
    await user.click(screen.getByTestId("pack-open-pick-0"));
    expect(consumableTilesCount()).toBe(before);
  });

  test("Familiar (transmute) pulled from pack does not consume a tray slot", async () => {
    const user = await openSpectralPack("familiar");
    const before = consumableTilesCount();
    await user.click(screen.getByTestId("pack-open-pick-0"));
    expect(consumableTilesCount()).toBe(before);
  });

  test("apply-seal spectral pulled from pack with no preview goes to the tray", async () => {
    const user = await openSpectralPack("talisman");
    const before = consumableTilesCount();
    await user.click(screen.getByTestId("pack-open-pick-0"));
    expect(consumableTilesCount()).toBe(before + 1);
  });
});
