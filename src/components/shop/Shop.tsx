import "./Shop.css";
import { useState } from "react";
import { createPortal } from "react-dom";
import { MAX_JOKERS } from "../../jokers";
import { MAX_CONSUMABLE_SLOTS } from "../../consumables";
import { rerollCostFor, type ShopItem } from "../../shop";
import type { Voucher, VoucherId } from "../../vouchers";
import { useEscapeToClose } from "../system/useEscapeToClose";

interface ShopProps {
  money: number;
  equippedJokerCount: number;
  consumableCount: number;
  offers: ReadonlyArray<ShopItem>;
  voucher: Voucher | null;
  voucherSold: boolean;
  ownedVoucherIds: ReadonlySet<VoucherId>;
  onBuy: (offerIdx: number) => void;
  onBuyVoucher: () => void;
  onReroll: (cost: number) => void;
  onNext: () => void;
}

interface VoucherButtonState {
  readonly disabled: boolean;
  readonly label: string;
  readonly title: string | undefined;
}

function resolveVoucherButton(
  voucher: Voucher,
  sold: boolean,
  money: number,
  ownedIds: ReadonlySet<VoucherId>,
): VoucherButtonState {
  if (sold) return { disabled: true, label: "Sold", title: "Already purchased this ante" };
  if (voucher.requires && !ownedIds.has(voucher.requires)) {
    return { disabled: true, label: `Buy ($${voucher.cost})`, title: `Requires ${voucher.requires}` };
  }
  if (money < voucher.cost) {
    return { disabled: true, label: `Buy ($${voucher.cost})`, title: "Not enough money" };
  }
  return { disabled: false, label: `Buy ($${voucher.cost})`, title: undefined };
}

type BuyButtonState =
  | { kind: "sold" }
  | { kind: "slots-full" }
  | { kind: "consumable-slots-full" }
  | { kind: "unaffordable" }
  | { kind: "available" };

function resolveBuyState(
  offer: ShopItem,
  money: number,
  equippedJokerCount: number,
  consumableCount: number,
): BuyButtonState {
  if (offer.sold) return { kind: "sold" };
  if (offer.kind === "joker" && equippedJokerCount >= MAX_JOKERS) {
    return { kind: "slots-full" };
  }
  if (
    (offer.kind === "planet" || offer.kind === "tarot") &&
    consumableCount >= MAX_CONSUMABLE_SLOTS
  ) {
    return { kind: "consumable-slots-full" };
  }
  if (money < offer.price) return { kind: "unaffordable" };
  return { kind: "available" };
}

function buyButtonLabel(state: BuyButtonState, price: number): string {
  switch (state.kind) {
    case "sold":
      return "Sold";
    case "slots-full":
      return "Slots full";
    case "consumable-slots-full":
      return "Slots full";
    case "unaffordable":
      return `Buy ($${price})`;
    case "available":
      return `Buy ($${price})`;
  }
}

function buyButtonTooltip(state: BuyButtonState): string | undefined {
  switch (state.kind) {
    case "sold":
      return "Already purchased this round";
    case "slots-full":
      return `Joker slots are full (max ${MAX_JOKERS})`;
    case "consumable-slots-full":
      return `Consumable slots are full (max ${MAX_CONSUMABLE_SLOTS})`;
    case "unaffordable":
      return "Not enough money";
    case "available":
      return undefined;
  }
}

function offerSubject(offer: ShopItem): {
  readonly id: string;
  readonly name: string;
  readonly description: string;
} {
  switch (offer.kind) {
    case "joker":
      return offer.joker;
    case "planet":
      return offer.planet;
    case "tarot":
      return offer.tarot;
  }
}

export default function Shop({
  money,
  equippedJokerCount,
  consumableCount,
  offers,
  voucher,
  voucherSold,
  ownedVoucherIds,
  onBuy,
  onBuyVoucher,
  onReroll,
  onNext,
}: ShopProps) {
  useEscapeToClose(onNext, true);
  const [rerollCount, setRerollCount] = useState(0);
  const currentRerollCost = rerollCostFor(rerollCount);
  const canAffordReroll = money >= currentRerollCost;
  const rerollTooltip = canAffordReroll
    ? undefined
    : "Not enough money to reroll";

  function handleReroll() {
    if (!canAffordReroll) return;
    onReroll(currentRerollCost);
    setRerollCount((prev) => prev + 1);
  }

  return createPortal(
    <div
      className="shop-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shop-title"
    >
      <div className="shop-modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="shop-title" className="shop-title">
          🛒 Shop
        </h2>
        <p className="shop-money" data-testid="shop-money">
          Money: ${money}
        </p>
        <section
          className="shop-voucher"
          data-testid="shop-voucher"
          aria-label="Voucher for this ante"
        >
          <h3 className="shop-voucher-heading">Voucher</h3>
          {voucher ? (() => {
            const btn = resolveVoucherButton(voucher, voucherSold, money, ownedVoucherIds);
            return (
              <div
                className={`shop-voucher-card${voucherSold ? " shop-voucher-sold" : ""}`}
                data-voucher-id={voucher.id}
              >
                <span className="shop-voucher-name">{voucher.name}</span>
                <span className="shop-voucher-description">{voucher.description}</span>
                <span className="shop-voucher-price">${voucher.cost}</span>
                <button
                  type="button"
                  className="shop-voucher-buy"
                  data-testid="shop-voucher-buy"
                  disabled={btn.disabled}
                  title={btn.title}
                  aria-label={`${btn.label}: ${voucher.name}`}
                  onClick={onBuyVoucher}
                >
                  {btn.label}
                </button>
              </div>
            );
          })() : (
            <p
              className="shop-voucher-empty"
              data-testid="shop-voucher-empty"
            >
              No voucher available this ante.
            </p>
          )}
        </section>
        <ul className="shop-offers" aria-label="Items for sale">
          {offers.map((offer, idx) => {
            const state = resolveBuyState(
              offer,
              money,
              equippedJokerCount,
              consumableCount,
            );
            const label = buyButtonLabel(state, offer.price);
            const subject = offerSubject(offer);
            return (
              <li
                key={`${offer.kind}-${subject.id}-${idx}`}
                className={`shop-offer shop-offer-${offer.kind}${
                  offer.sold ? " shop-offer-sold" : ""
                }`}
                data-testid={`shop-offer-${idx}`}
                data-offer-kind={offer.kind}
              >
                <span className="shop-offer-name">{subject.name}</span>
                <span className="shop-offer-description">{subject.description}</span>
                <span className="shop-offer-price">${offer.price}</span>
                <button
                  type="button"
                  className="shop-offer-buy"
                  disabled={state.kind !== "available"}
                  title={buyButtonTooltip(state)}
                  aria-label={`${label}: ${subject.name}`}
                  onClick={() => onBuy(idx)}
                >
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="shop-actions">
          <button
            type="button"
            className="shop-reroll"
            onClick={handleReroll}
            disabled={!canAffordReroll}
            title={rerollTooltip}
            aria-label={`Reroll shop offers for $${currentRerollCost}`}
          >
            Reroll (${currentRerollCost})
          </button>
          <button
            type="button"
            className="shop-next"
            onClick={onNext}
            autoFocus
          >
            Next Round →
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
