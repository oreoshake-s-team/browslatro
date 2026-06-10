import { useGame } from "../store/game";
import { deckSuppressesInterest } from "../items/decks";
import { interestCapFor } from "../items/vouchers";
import { REMAINING_HAND_BONUS, calculateInterest } from "../scoring/payout";

const BOOT_SHOP_KEY = "browslatro:bootShop";

let didBoot = false;

export function shouldBootIntoShop(): boolean {
  try {
    return window.localStorage.getItem(BOOT_SHOP_KEY) === "1";
  } catch {
    return false;
  }
}

export function bootIntoShop(): void {
  if (didBoot) return;
  didBoot = true;
  const s = useGame.getState();
  s.setPendingRunSelect(false);
  s.setPendingBlindSelect(false);
  const interestWallet = s.money;
  const interest = deckSuppressesInterest(s.selectedDeck)
    ? 0
    : calculateInterest(interestWallet, interestCapFor(s.ownedVoucherIds));
  const handsBonus =
    Math.max(0, s.remainingHands - 1) * REMAINING_HAND_BONUS;
  if (handsBonus > 0) s.earn(handsBonus);
  s.handleWin({ interest, interestWallet });
}

export function _resetBootShopForTests(): void {
  didBoot = false;
}
