import "./Shop.css";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  localizedConsumableDescription,
  localizedConsumableName,
} from "../../i18n/contentOverrides";
import type {
  CardEdition,
  Enhancement,
  Seal,
} from "../../cards/types";
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

interface VoucherButtonState {
  readonly disabled: boolean;
  readonly label: string;
  readonly title: string | undefined;
}

function resolveVoucherButton(
  t: TFunction,
  voucher: Voucher,
  sold: boolean,
  money: number,
  ownedIds: ReadonlySet<VoucherId>,
): VoucherButtonState {
  if (sold) {
    return {
      disabled: true,
      label: t("shop.sold"),
      title: t("shop.alreadyPurchasedAnte"),
    };
  }
  const price = applyShopDiscount(voucher.cost, ownedIds);
  if (voucher.requires && !ownedIds.has(voucher.requires)) {
    return {
      disabled: true,
      label: t("shop.buy", { price }),
      title: t("shop.requiresVoucher", { voucher: voucher.requires }),
    };
  }
  if (money < price) {
    return {
      disabled: true,
      label: t("shop.buy", { price }),
      title: t("shop.notEnoughMoney"),
    };
  }
  return { disabled: false, label: t("shop.buy", { price }), title: undefined };
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
  t: TFunction,
  state: BuyButtonState,
  price: number,
  kind: ShopItem["kind"],
): string {
  switch (state.kind) {
    case "sold":
      return t("shop.sold");
    case "slots-full":
      return t("shop.slotsFull");
    case "consumable-slots-full":
      return t("shop.slotsFull");
    case "unaffordable":
    case "available":
      return kind === "pack"
        ? t("shop.open", { price })
        : t("shop.buy", { price });
  }
}

function buyButtonTooltip(
  t: TFunction,
  state: BuyButtonState,
  consumableCapacity: number,
  jokerCapacity: number,
): string | undefined {
  switch (state.kind) {
    case "sold":
      return t("shop.alreadyPurchasedRound");
    case "slots-full":
      return t("shop.jokerSlotsFullMax", { max: jokerCapacity });
    case "consumable-slots-full":
      return t("shop.consumableSlotsFullMax", { max: consumableCapacity });
    case "unaffordable":
      return t("shop.notEnoughMoney");
    case "available":
      return undefined;
  }
}

const SUIT_GLYPH: Record<string, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

const ENHANCEMENT_LABEL_KEY = {
  bonus: "cardLabels.enhancementBonus",
  mult: "cardLabels.enhancementMult",
  wild: "cardLabels.enhancementWild",
  glass: "cardLabels.enhancementGlass",
  steel: "cardLabels.enhancementSteel",
  stone: "cardLabels.enhancementStone",
  gold: "cardLabels.enhancementGold",
  lucky: "cardLabels.enhancementLucky",
} as const satisfies Record<Enhancement, string>;

const CARD_EDITION_LABEL_KEY = {
  foil: "cardLabels.editionFoil",
  holographic: "cardLabels.editionHolographic",
  polychrome: "cardLabels.editionPolychrome",
} as const satisfies Record<CardEdition, string>;

const SEAL_LABEL_KEY = {
  gold: "cardLabels.sealGold",
  red: "cardLabels.sealRed",
  blue: "cardLabels.sealBlue",
  purple: "cardLabels.sealPurple",
} as const satisfies Record<Seal, string>;

function playingCardSummary(
  t: TFunction,
  card: import("../../cards/types").Card,
): {
  readonly name: string;
  readonly description: string;
} {
  const name = `${card.rank}${SUIT_GLYPH[card.suit] ?? ""}`;
  const traits: string[] = [];
  if (card.enhancement) traits.push(`${card.enhancement} enhancement`);
  if (card.edition) traits.push(`${card.edition} edition`);
  if (card.seal) traits.push(`${card.seal} seal`);
  const description =
    traits.length === 0
      ? t("shop.addsPlayingCard")
      : t("shop.addsPlayingCardWith", { traits: traits.join(", ") });
  return { name, description };
}

function localizedSubject(
  locale: string,
  item: { readonly id: string; readonly name: string; readonly description: string },
): { readonly id: string; readonly name: string; readonly description: string } {
  return {
    id: item.id,
    name: localizedConsumableName(locale, item.id, item.name),
    description: localizedConsumableDescription(locale, item.id, item.description),
  };
}

function offerSubject(
  t: TFunction,
  locale: string,
  offer: ShopItem,
): {
  readonly id: string;
  readonly name: string;
  readonly description: string;
} {
  switch (offer.kind) {
    case "joker":
      return offer.joker;
    case "planet":
      return localizedSubject(locale, offer.planet);
    case "tarot":
      return localizedSubject(locale, offer.tarot);
    case "spectral":
      return localizedSubject(locale, offer.spectral);
    case "playing-card": {
      const summary = playingCardSummary(t, offer.card);
      return {
        id: `playing-card-${offer.card.id}`,
        name: summary.name,
        description: summary.description,
      };
    }
    case "pack": {
      const optionCount = packOptionsCount(offer.pack.pool, offer.pack.variant);
      const pickCount = packPickLimit(offer.pack.variant);
      return {
        id: `pack-${offer.pack.pool}-${offer.pack.variant}`,
        name: packDisplayName(offer.pack),
        description:
          pickCount === 1
            ? t("shop.packOpenToPickOne", { options: optionCount })
            : t("shop.packOpenToPickMany", {
                count: pickCount,
                options: optionCount,
              }),
      };
    }
  }
}

const OFFER_KIND_ICON: Readonly<Record<ShopItem["kind"], string>> = {
  joker: "🃏",
  planet: "🪐",
  tarot: "🔮",
  spectral: "👻",
  "playing-card": "♠",
  pack: "🎁",
};

const OFFER_KIND_LABEL_KEY = {
  joker: "shop.kindJoker",
  planet: "shop.kindPlanet",
  tarot: "shop.kindTarot",
  spectral: "shop.kindSpectral",
  "playing-card": "shop.kindCard",
  pack: "shop.kindPack",
} as const satisfies Record<ShopItem["kind"], string>;

const JOKER_EDITION_LABEL_KEY = {
  foil: "cardLabels.editionFoil",
  holographic: "cardLabels.editionHolographic",
  polychrome: "cardLabels.editionPolychrome",
  negative: "cardLabels.editionNegative",
} as const satisfies Record<JokerEdition, string>;

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
  const { t, i18n } = useTranslation();
  const lockTooltip = t("shop.finishPickingFirst");
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
    ? lockTooltip
    : canAffordReroll
      ? undefined
      : t("shop.notEnoughMoneyReroll");

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
    const label = buyButtonLabel(t, state, effectivePrice, offer.kind);
    const subject = offerSubject(t, i18n.language, offer);
    const edition = offer.kind === "joker" ? offer.joker.edition : undefined;
    const card = offer.kind === "playing-card" ? offer.card : undefined;
    const cardEnhancement = card?.enhancement ?? undefined;
    const cardEdition = card?.edition ?? undefined;
    const cardSeal = card?.seal ?? undefined;
    const playingCardEnhanced = Boolean(
      cardEnhancement || cardEdition || cardSeal,
    );
    const isFree = !offer.sold && effectivePrice === 0;
    const modifierClasses = [
      offer.sold && "shop-offer-sold",
      edition && "shop-offer-editioned",
      playingCardEnhanced && "shop-offer-playing-card-enhanced",
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
        data-card-enhancement={cardEnhancement}
        data-card-edition={cardEdition}
        data-card-seal={cardSeal}
        data-pack-pool={offer.kind === "pack" ? offer.pack.pool : undefined}
      >
        <span
          className={`shop-offer-kind shop-offer-kind-${offer.kind}`}
          data-testid={`shop-kind-${idx}`}
        >
          <span aria-hidden="true" className="shop-offer-kind-icon">
            {OFFER_KIND_ICON[offer.kind]}
          </span>
          <span className="shop-offer-kind-label">
            {t(OFFER_KIND_LABEL_KEY[offer.kind])}
          </span>
        </span>
        <span className="shop-offer-name">
          {subject.name}
          {edition && (
            <span
              className="shop-offer-edition-badge"
              data-testid={`shop-edition-${idx}`}
            >
              {t(JOKER_EDITION_LABEL_KEY[edition])}
            </span>
          )}
          {cardEnhancement && (
            <span
              className={`shop-offer-card-badge shop-offer-card-enhancement-badge shop-offer-card-enhancement-${cardEnhancement}`}
              data-testid={`shop-card-enhancement-${idx}`}
            >
              {t(ENHANCEMENT_LABEL_KEY[cardEnhancement])}
            </span>
          )}
          {cardEdition && (
            <span
              className={`shop-offer-card-badge shop-offer-card-edition-badge shop-offer-card-edition-${cardEdition}`}
              data-testid={`shop-card-edition-${idx}`}
            >
              {t(CARD_EDITION_LABEL_KEY[cardEdition])}
            </span>
          )}
          {cardSeal && (
            <span
              className={`shop-offer-card-badge shop-offer-card-seal-badge shop-offer-card-seal-${cardSeal}`}
              data-testid={`shop-card-seal-${idx}`}
            >
              {t(SEAL_LABEL_KEY[cardSeal])}
            </span>
          )}
        </span>
        <span className="shop-offer-description">{subject.description}</span>
        {offer.kind === "joker" && (
          <JokerStickerBadges joker={offer.joker} />
        )}
        <span className="shop-offer-price">
          {isFree ? (
            <span className="shop-offer-price-free">{t("shop.free")}</span>
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
            disabled
              ? lockTooltip
              : buyButtonTooltip(t, state, consumableCapacity, jokerCapacity)
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
          🛒 {t("shop.title")}
        </h2>
        <p className="shop-money" data-testid="shop-money">
          {t("shop.money", { amount: money })}
        </p>
        <div className="shop-cards-row">
          <button
            type="button"
            className="btn shop-reroll"
            onClick={handleReroll}
            disabled={disabled || !canAffordReroll}
            title={rerollTooltip}
            aria-label={`Reroll shop offers for $${currentRerollCost}`}
          >
            {t("shop.reroll", { cost: currentRerollCost })}
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
              {vouchers.length === 1
                ? t("shop.voucherHeadingOne")
                : t("shop.voucherHeadingOther")}
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
                {t("shop.noVoucherThisAnte")}
              </p>
            ) : (
              <ul className="shop-voucher-list">
                {vouchers.map((voucher, idx) => {
                  const sold = soldVoucherIds.has(voucher.id);
                  const btn = resolveVoucherButton(
                    t,
                    voucher,
                    sold,
                    money,
                    ownedVoucherIds,
                  );
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
                        title={disabled ? lockTooltip : btn.title}
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
            <h3 className="shop-packs-heading">{t("shop.boosterPacks")}</h3>
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
            className="btn btn--secondary shop-next"
            onClick={onNext}
            disabled={disabled}
            title={disabled ? lockTooltip : undefined}
            autoFocus
          >
            {t("shop.nextRound")}
          </button>
        </div>
      </div>
    </section>
  );
}
