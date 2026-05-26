import "./Shop.css";
import { useState } from "react";
import { createPortal } from "react-dom";
import { MAX_JOKERS } from "../../items/jokers";
import { packDisplayName, packOptionsCount, packPickLimit } from "../../items/packs";
import { rerollCostFor, type ShopItem } from "../../items/shop";
import {
  applyShopDiscount,
  type Voucher,
  type VoucherId,
} from "../../items/vouchers";
import { useEscapeToClose } from "../system/useEscapeToClose";

interface ShopProps {
  money: number;
  equippedJokerCount: number;
  consumableCount: number;
  consumableCapacity: number;
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
  effectivePrice: number,
  money: number,
  equippedJokerCount: number,
  consumableCount: number,
  consumableCapacity: number,
): BuyButtonState {
  if (offer.sold) return { kind: "sold" };
  if (offer.kind === "joker" && equippedJokerCount >= MAX_JOKERS) {
    return { kind: "slots-full" };
  }
  if (
    (offer.kind === "planet" ||
      offer.kind === "tarot" ||
      offer.kind === "spectral") &&
    consumableCount >= consumableCapacity
  ) {
    return { kind: "consumable-slots-full" };
  }
  if (money < effectivePrice) return { kind: "unaffordable" };
  return { kind: "available" };
}

function buyButtonLabel(
  state: BuyButtonState,
  price: number,
  kind: ShopItem["kind"],
): string {
  const verb = kind === "pack" ? "Open" : "Buy";
  switch (state.kind) {
    case "sold":
      return "Sold";
    case "slots-full":
      return "Slots full";
    case "consumable-slots-full":
      return "Slots full";
    case "unaffordable":
      return `${verb} ($${price})`;
    case "available":
      return `${verb} ($${price})`;
  }
}

function buyButtonTooltip(
  state: BuyButtonState,
  consumableCapacity: number,
): string | undefined {
  switch (state.kind) {
    case "sold":
      return "Already purchased this round";
    case "slots-full":
      return `Joker slots are full (max ${MAX_JOKERS})`;
    case "consumable-slots-full":
      return `Consumable slots are full (max ${consumableCapacity})`;
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
    case "spectral":
      return offer.spectral;
    case "pack": {
      const optionCount = packOptionsCount(offer.pack.pool, offer.pack.variant);
      const pickCount = packPickLimit(offer.pack.variant);
      const picks = pickCount === 1 ? "1 card" : `${pickCount} cards`;
      return {
        id: `pack-${offer.pack.pool}-${offer.pack.variant}`,
        name: packDisplayName(offer.pack),
        description: `Open to pick ${picks} from ${optionCount} options`,
      };
    }
  }
}

const OFFER_KIND_BADGE: Readonly<
  Record<ShopItem["kind"], { readonly icon: string; readonly label: string }>
> = {
  joker: { icon: "🃏", label: "Joker" },
  planet: { icon: "🪐", label: "Planet" },
  tarot: { icon: "🔮", label: "Tarot" },
  spectral: { icon: "👻", label: "Spectral" },
  pack: { icon: "🎁", label: "Pack" },
};

export default function Shop({
  money,
  equippedJokerCount,
  consumableCount,
  consumableCapacity,
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
            const effectivePrice = applyShopDiscount(offer.price, ownedVoucherIds);
            const discounted = effectivePrice < offer.price;
            const state = resolveBuyState(
              offer,
              effectivePrice,
              money,
              equippedJokerCount,
              consumableCount,
              consumableCapacity,
            );
            const label = buyButtonLabel(state, effectivePrice, offer.kind);
            const subject = offerSubject(offer);
            const badge = OFFER_KIND_BADGE[offer.kind];
            return (
              <li
                key={`${offer.kind}-${subject.id}-${idx}`}
                className={`shop-offer shop-offer-${offer.kind}${
                  offer.sold ? " shop-offer-sold" : ""
                }`}
                data-testid={`shop-offer-${idx}`}
                data-offer-kind={offer.kind}
              >
                <span
                  className={`shop-offer-kind shop-offer-kind-${offer.kind}`}
                  data-testid={`shop-kind-${idx}`}
                >
                  <span aria-hidden="true" className="shop-offer-kind-icon">
                    {badge.icon}
                  </span>
                  <span className="shop-offer-kind-label">{badge.label}</span>
                </span>
                <span className="shop-offer-name">{subject.name}</span>
                <span className="shop-offer-description">{subject.description}</span>
                <span className="shop-offer-price">
                  {discounted ? (
                    <>
                      <span className="shop-offer-price-original">${offer.price}</span>
                      <span className="shop-offer-price-discounted">${effectivePrice}</span>
                    </>
                  ) : (
                    `$${offer.price}`
                  )}
                </span>
                <button
                  type="button"
                  className="shop-offer-buy"
                  disabled={state.kind !== "available"}
                  title={buyButtonTooltip(state, consumableCapacity)}
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
