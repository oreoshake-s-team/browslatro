import "./Shop.css";
import { useState } from "react";
import { type JokerEdition } from "../../items/jokers";
import { packDisplayName, packOptionsCount, packPickLimit } from "../../items/packs";
import { rerollCostFor, type ShopItem } from "../../items/shop";
import {
  applyShopDiscount,
  rerollCostReduction,
  type Voucher,
  type VoucherId,
} from "../../items/vouchers";
import JokerStickerBadges from "../jokers/JokerStickerBadges";
import { useEscapeToClose } from "../system/useEscapeToClose";

export interface ShopProps {
  money: number;
  equippedJokerCount: number;
  jokerCapacity: number;
  consumableCount: number;
  consumableCapacity: number;
  offers: ReadonlyArray<ShopItem>;
  vouchers: ReadonlyArray<Voucher>;
  soldVoucherIds: ReadonlySet<VoucherId>;
  ownedVoucherIds: ReadonlySet<VoucherId>;
  onBuy: (offerIdx: number) => void;
  onBuyVoucher: (voucherIdx: number) => void;
  onReroll: (cost: number) => void;
  onNext: () => void;
  voucherOptions?: ReadonlyArray<Voucher>;
  onSetVoucher?: (id: string) => void;
  disabled?: boolean;
  extraRerollReduction?: number;
  freeFirstReroll?: boolean;
}

const LOCK_TOOLTIP = "Finish picking from the pack first";

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
  const price = applyShopDiscount(voucher.cost, ownedIds);
  if (voucher.requires && !ownedIds.has(voucher.requires)) {
    return { disabled: true, label: `Buy ($${price})`, title: `Requires ${voucher.requires}` };
  }
  if (money < price) {
    return { disabled: true, label: `Buy ($${price})`, title: "Not enough money" };
  }
  return { disabled: false, label: `Buy ($${price})`, title: undefined };
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
  jokerCapacity: number,
  consumableCount: number,
  consumableCapacity: number,
): BuyButtonState {
  if (offer.sold) return { kind: "sold" };
  if (offer.kind === "joker" && equippedJokerCount >= jokerCapacity) {
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
  jokerCapacity: number,
): string | undefined {
  switch (state.kind) {
    case "sold":
      return "Already purchased this round";
    case "slots-full":
      return `Joker slots are full (max ${jokerCapacity})`;
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

const EDITION_LABEL: Readonly<Record<JokerEdition, string>> = {
  foil: "Foil",
  holographic: "Holographic",
  polychrome: "Polychrome",
  negative: "Negative",
};

export default function Shop({
  money,
  equippedJokerCount,
  jokerCapacity,
  consumableCount,
  consumableCapacity,
  offers,
  vouchers,
  soldVoucherIds,
  ownedVoucherIds,
  onBuy,
  onBuyVoucher,
  onReroll,
  onNext,
  voucherOptions,
  onSetVoucher,
  disabled = false,
  extraRerollReduction = 0,
  freeFirstReroll = false,
}: ShopProps) {
  useEscapeToClose(onNext, !disabled);
  const canOverrideVoucher =
    voucherOptions !== undefined &&
    voucherOptions.length > 0 &&
    Boolean(onSetVoucher);
  const [rerollCount, setRerollCount] = useState(0);
  const baseRerollCost = rerollCostFor(
    rerollCount,
    rerollCostReduction(ownedVoucherIds) + extraRerollReduction,
  );
  const isFreeFirstReroll = freeFirstReroll && rerollCount === 0;
  const currentRerollCost = isFreeFirstReroll ? 0 : baseRerollCost;
  const canAffordReroll = money >= currentRerollCost;
  const rerollTooltip = disabled
    ? LOCK_TOOLTIP
    : canAffordReroll
      ? undefined
      : "Not enough money to reroll";

  function handleReroll() {
    if (disabled || !canAffordReroll) return;
    onReroll(currentRerollCost);
    setRerollCount((prev) => prev + 1);
  }

  function renderOffer(offer: ShopItem, idx: number) {
    const effectivePrice = applyShopDiscount(offer.price, ownedVoucherIds);
    const discounted = effectivePrice < offer.price;
    const state = resolveBuyState(
      offer,
      effectivePrice,
      money,
      equippedJokerCount,
      jokerCapacity,
      consumableCount,
      consumableCapacity,
    );
    const label = buyButtonLabel(state, effectivePrice, offer.kind);
    const subject = offerSubject(offer);
    const badge = OFFER_KIND_BADGE[offer.kind];
    const edition = offer.kind === "joker" ? offer.joker.edition : undefined;
    const isFree = !offer.sold && effectivePrice === 0;
    const modifierClasses = [
      offer.sold && "shop-offer-sold",
      edition && "shop-offer-editioned",
      isFree && "shop-offer-free",
    ]
      .filter(Boolean)
      .join(" ");
    return (
      <li
        key={`${offer.kind}-${subject.id}-${idx}`}
        className={`shop-offer shop-offer-${offer.kind}${
          modifierClasses ? ` ${modifierClasses}` : ""
        }`}
        data-testid={`shop-offer-${idx}`}
        data-offer-kind={offer.kind}
        data-edition={edition}
        data-pack-pool={offer.kind === "pack" ? offer.pack.pool : undefined}
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
        <span className="shop-offer-name">
          {subject.name}
          {edition && (
            <span
              className="shop-offer-edition-badge"
              data-testid={`shop-edition-${idx}`}
            >
              {EDITION_LABEL[edition]}
            </span>
          )}
        </span>
        <span className="shop-offer-description">{subject.description}</span>
        {offer.kind === "joker" && (
          <JokerStickerBadges joker={offer.joker} />
        )}
        <span className="shop-offer-price">
          {isFree ? (
            <span className="shop-offer-price-free">FREE</span>
          ) : discounted ? (
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
          disabled={disabled || state.kind !== "available"}
          title={
            disabled ? LOCK_TOOLTIP : buyButtonTooltip(state, consumableCapacity, jokerCapacity)
          }
          aria-label={`${label}: ${subject.name}`}
          onClick={() => onBuy(idx)}
        >
          {label}
        </button>
      </li>
    );
  }

  return (
    <section
      className="shop-panel"
      role="region"
      aria-labelledby="shop-title"
    >
      <div className="shop-inner">
        <h2 id="shop-title" className="shop-title">
          🛒 Shop
        </h2>
        <p className="shop-money" data-testid="shop-money">
          Money: ${money}
        </p>
        <div className="shop-cards-row">
          <button
            type="button"
            className="shop-reroll"
            onClick={handleReroll}
            disabled={disabled || !canAffordReroll}
            title={rerollTooltip}
            aria-label={`Reroll shop offers for $${currentRerollCost}`}
          >
            Reroll (${currentRerollCost})
          </button>
          <ul className="shop-offers shop-offers-cards" aria-label="Items for sale">
            {offers.map((offer, idx) => {
              if (offer.kind === "pack") return null;
              return renderOffer(offer, idx);
            })}
          </ul>
        </div>
        <div className="shop-extras-row">
          <section
            className="shop-voucher"
            data-testid="shop-voucher"
            aria-label="Vouchers for this ante"
          >
            <h3 className="shop-voucher-heading">
              {vouchers.length === 1 ? "Voucher" : "Vouchers"}
            </h3>
            {canOverrideVoucher && (
              <select
                className="shop-voucher-override"
                data-testid="shop-voucher-override"
                aria-label="Override offered voucher (dev)"
                value={vouchers[0]?.id ?? voucherOptions[0].id}
                onChange={(e) => onSetVoucher?.(e.target.value)}
              >
                {voucherOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            )}
            {vouchers.length === 0 ? (
              <p
                className="shop-voucher-empty"
                data-testid="shop-voucher-empty"
              >
                No voucher available this ante.
              </p>
            ) : (
              <ul className="shop-voucher-list">
                {vouchers.map((voucher, idx) => {
                  const sold = soldVoucherIds.has(voucher.id);
                  const btn = resolveVoucherButton(voucher, sold, money, ownedVoucherIds);
                  const displayPrice = applyShopDiscount(
                    voucher.cost,
                    ownedVoucherIds,
                  );
                  return (
                    <li
                      key={voucher.id}
                      className={`shop-voucher-card${sold ? " shop-voucher-sold" : ""}`}
                      data-voucher-id={voucher.id}
                      data-testid={`shop-voucher-${idx}`}
                    >
                      <span className="shop-voucher-name">{voucher.name}</span>
                      <span className="shop-voucher-description">{voucher.description}</span>
                      <span className="shop-voucher-price">${displayPrice}</span>
                      <button
                        type="button"
                        className="shop-voucher-buy"
                        data-testid={`shop-voucher-buy-${idx}`}
                        disabled={disabled || btn.disabled}
                        title={disabled ? LOCK_TOOLTIP : btn.title}
                        aria-label={`${btn.label}: ${voucher.name}`}
                        onClick={() => onBuyVoucher(idx)}
                      >
                        {btn.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section
            className="shop-packs"
            data-testid="shop-packs"
            aria-label="Booster packs for sale"
          >
            <h3 className="shop-packs-heading">Booster Packs</h3>
            <ul className="shop-offers shop-offers-packs" aria-label="Packs for sale">
              {offers.map((offer, idx) => {
                if (offer.kind !== "pack") return null;
                return renderOffer(offer, idx);
              })}
            </ul>
          </section>
        </div>
        <div className="shop-actions">
          <button
            type="button"
            className="shop-next"
            onClick={onNext}
            disabled={disabled}
            title={disabled ? LOCK_TOOLTIP : undefined}
            autoFocus
          >
            Next Round →
          </button>
        </div>
      </div>
    </section>
  );
}
