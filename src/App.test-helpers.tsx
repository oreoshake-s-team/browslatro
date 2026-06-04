import type { MockedFunction } from "vitest";
import { act, fireEvent, screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import {
  isHighVisibility,
  toggleHighVisibility,
} from "./components/system/preferences";
import { play } from "./components/system/sounds";
import { shopPickerRngConfig } from "./items/shop";
import { bossPickerRngConfig } from "./items/bosses";
import { tagOfferRngConfig } from "./items/tags";
import type { ShopItem } from "./items/shop";
import { useGame } from "./store/game";

export type ShopOfferKind = Exclude<ShopItem["kind"], "pack">;

export const mockShuffleConfig = { useIdentity: false, useReverse: false };
export const mockDeckConfig = { useDefaultEnhancements: false };

export const playMock = play as MockedFunction<typeof play>;

export function findShopOfferIdxOfKind(kind: ShopOfferKind): number {
  const offers = screen.queryAllByTestId(/^shop-offer-/);
  for (let i = 0; i < offers.length; i += 1) {
    if (offers[i].getAttribute("data-offer-kind") === kind) return i;
  }
  throw new Error(`No shop offer of kind '${kind}' found`);
}

export function resetHighVisibility(): void {
  if (isHighVisibility()) {
    toggleHighVisibility();
  }
  window.localStorage.removeItem("browslatro:highVisibility");
}

export function getStatValue(label: string): HTMLElement {
  return screen.getByText(label).parentElement as HTMLElement;
}

export async function dismissBlindSelect(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  const runConfirm = screen.queryByTestId("new-run-confirm");
  if (runConfirm) await user.click(runConfirm);
  const btn = screen.queryByTestId("blind-select-play");
  if (btn) await user.click(btn);
}

export function getHandCardButtons(): HTMLElement[] {
  return Array.from(
    screen.getByLabelText("Your hand").querySelectorAll("button[aria-pressed]"),
  );
}

export function getHandGaps(): HTMLElement[] {
  return Array.from(
    screen
      .getByLabelText("Your hand")
      .querySelectorAll('[data-testid^="hand-gap-"]'),
  );
}

export function findHandSlotByCardLabel(label: string): HTMLElement {
  const button = screen.getByRole("button", { name: label });
  const slot = button.closest('[data-testid^="hand-slot-"]');
  if (!slot) throw new Error(`Could not find hand slot for "${label}"`);
  return slot as HTMLElement;
}

export function dragCardToGap(cardLabel: string, gapIdx: number): void {
  const source = findHandSlotByCardLabel(cardLabel);
  const gap = getHandGaps()[gapIdx];
  fireEvent.dragStart(source);
  fireEvent.dragOver(gap);
  fireEvent.drop(gap);
  fireEvent.dragEnd(source);
}

export function flushScoringSequence(): void {
  for (let i = 0; i < 20; i++) {
    if (vi.getTimerCount() === 0) return;
    act(() => {
      vi.runOnlyPendingTimers();
    });
  }
}

export function flushDiscardAnimation(): void {
  flushScoringSequence();
  getHandCardButtons()
    .filter((btn) => btn.classList.contains("card-discarding"))
    .forEach((btn) => fireEvent.animationEnd(btn));
}

export function setupAppTestEnvironment(): void {
  beforeEach(() => {
    mockShuffleConfig.useIdentity = false;
    mockShuffleConfig.useReverse = false;
    mockDeckConfig.useDefaultEnhancements = false;
    bossPickerRngConfig.rng = () => 0;
    tagOfferRngConfig.rng = () => 0;
    playMock.mockClear();
    useGame.getState().setPendingRunSelect(false);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers();
    });
    vi.useRealTimers();
    shopPickerRngConfig.rng = Math.random;
    bossPickerRngConfig.rng = Math.random;
    tagOfferRngConfig.rng = Math.random;
  });
}
