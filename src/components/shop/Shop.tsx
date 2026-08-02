import { Suspense, lazy, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { cva } from "class-variance-authority";
import {
  localizedConsumableDescription,
  localizedConsumableName,
} from "../../i18n/contentOverrides";
import { appendFoolHint } from "../../i18n/foolCopyTarget";
import {
  localizedJokerDescription,
  localizedJokerName,
} from "../../i18n/jokerOverrides";
import {
  localizedVoucherDescription,
  localizedVoucherName,
} from "../../i18n/voucherOverrides";
import { packDisplayName, packOptionsCount, packPickLimit } from "../../items/packs";
import { rerollCostFor, type ShopItem } from "../../items/shop";
import {
  applyShopDiscount,
  rerollCostReduction,
  type Voucher,
  type VoucherId,
} from "../../items/vouchers";
import JokerStickerBadges from "../jokers/JokerStickerBadges";
import CardModifierBadges from "../cards/CardModifierBadges";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { usePreferences } from "../system/preferences";
import { Button } from "../ui/Button";
import { Panel } from "../ui/Panel";
import { cn } from "../ui/cn";
import RenderProfiler from "../../dev/RenderProfiler";

const ShopSuggestion = lazy(() => import("./ShopSuggestion"));

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
  foolCopyTarget?: string;
}

interface VoucherButtonState {
  readonly disabled: boolean;
  readonly label: string;
  readonly title: string | undefined;
}

function resolveVoucherButton(
  t: TFunction,
  locale: string,
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
      title: t("shop.requiresVoucher", {
        voucher: localizedVoucherName(locale, voucher.requires, voucher.requires),
      }),
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
  if (
    offer.kind === "joker" &&
    offer.joker.edition !== "negative" &&
    equippedJokerCount >= jokerCapacity
  ) {
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
      return {
        id: offer.joker.id,
        name: localizedJokerName(locale, offer.joker.id, offer.joker.name),
        description: localizedJokerDescription(
          locale,
          offer.joker.id,
          offer.joker.description,
        ),
      };
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

const offerTile = cva(
  "grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-1 rounded-lg border border-l-4 border-border bg-raised p-3 transition-opacity",
  {
    variants: {
      kind: {
        joker: "border-l-mult",
        planet: "border-l-chips",
        tarot: "border-l-advisor",
        spectral: "border-l-focus",
        "playing-card": "border-l-money",
        pack: "border-l-money",
      },
      sold: {
        true: "opacity-60 saturate-50",
      },
    },
  },
);

const EDITION_RING: Record<
  "foil" | "holographic" | "polychrome" | "negative",
  string
> = {
  foil: "ring-2 ring-chips ring-inset",
  holographic: "ring-2 ring-advisor ring-inset",
  polychrome: "ring-2 ring-success ring-inset",
  negative: "bg-black ring-2 ring-white/60 ring-inset",
};

const SECTION_HEADING = "text-xs font-bold tracking-wider uppercase";

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
  foolCopyTarget,
}: ShopProps) {
  const { t, i18n } = useTranslation();
  const lockTooltip = t("shop.finishPickingFirst");
  useEscapeToClose(onNext, !disabled);
  const adminMode = usePreferences((s) => s.adminMode);
  const canOverrideVoucher =
    adminMode &&
    voucherOptions !== undefined &&
    voucherOptions.length > 0 &&
    Boolean(onSetVoucher);
  const [rerollCount, setRerollCount] = useState(0);
  const [suggestSlot, setSuggestSlot] = useState<HTMLDivElement | null>(null);
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
    return (
      <li
        key={`${offer.kind}-${subject.id}-${idx}`}
        className={cn(
          offerTile({ kind: offer.kind, sold: offer.sold }),
          edition && EDITION_RING[edition],
          cardEdition && EDITION_RING[cardEdition],
        )}
        data-shop-offer=""
        data-testid={`shop-offer-${idx}`}
        data-offer-kind={offer.kind}
        data-edition={edition}
        data-sold={offer.sold || undefined}
        data-free={isFree || undefined}
        data-enhanced={playingCardEnhanced || undefined}
        data-card-enhancement={cardEnhancement}
        data-card-edition={cardEdition}
        data-card-seal={cardSeal}
        data-pack-pool={offer.kind === "pack" ? offer.pack.pool : undefined}
        data-pack-variant={offer.kind === "pack" ? offer.pack.variant : undefined}
      >
        <span
          className={cn(
            "col-span-3 row-start-1 inline-flex items-center gap-1 justify-self-start text-muted",
            SECTION_HEADING,
          )}
          data-testid={`shop-kind-${idx}`}
        >
          <span aria-hidden="true" className="text-sm leading-none">
            {OFFER_KIND_ICON[offer.kind]}
          </span>
          <span>{t(OFFER_KIND_LABEL_KEY[offer.kind])}</span>
        </span>
        <span
          className="col-start-1 row-start-2 font-semibold"
          data-shop-offer-name=""
        >
          {subject.name}
          <CardModifierBadges
            scope="shop"
            suffix={idx}
            jokerEdition={edition}
            enhancement={cardEnhancement}
            cardEdition={cardEdition}
            seal={cardSeal}
          />
        </span>
        <span
          className="col-span-3 row-start-3 text-xs text-muted"
          data-shop-offer-description=""
        >
          {appendFoolHint(subject.description, subject.id, foolCopyTarget)}
        </span>
        {offer.kind === "joker" && (
          <JokerStickerBadges joker={offer.joker} />
        )}
        <span
          className="col-start-2 row-start-2 flex items-center gap-1.5 font-bold text-money"
          data-shop-offer-price=""
        >
          {isFree ? (
            <span
              className="font-extrabold tracking-wider text-success"
              data-shop-offer-price-free=""
            >
              {t("shop.free")}
            </span>
          ) : discounted ? (
            <>
              <span
                className="text-xs font-normal text-muted line-through"
                data-shop-offer-price-original=""
              >
                ${offer.price}
              </span>
              <span data-shop-offer-price-discounted="" className="text-mult">
                ${effectivePrice}
              </span>
            </>
          ) : (
            `$${offer.price}`
          )}
        </span>
        <Button
          variant="primary"
          size="sm"
          className="col-start-3 row-start-2"
          data-shop-buy=""
          disabled={disabled || state.kind !== "available"}
          title={
            disabled
              ? lockTooltip
              : buyButtonTooltip(t, state, consumableCapacity, jokerCapacity)
          }
          aria-label={t("a11y.buyOffer", { label, name: subject.name })}
          onClick={() => onBuy(idx)}
        >
          {label}
        </Button>
      </li>
    );
  }

  return (
    <RenderProfiler id="Shop">
    <section
      className="flex w-full max-w-225 justify-start"
      aria-labelledby="shop-title"
    >
      <Panel className="flex w-full flex-col gap-4">
        <h2 id="shop-title" className="text-center text-xl font-bold">
          {t("shop.title")}
        </h2>
        <p
          className="text-center text-sm font-semibold text-muted"
          data-testid="shop-money"
        >
          {t("shop.money", { amount: money })}
        </p>
        <div className="flex items-stretch gap-3">
          <Button
            className="shrink-0 self-stretch text-money"
            data-testid="shop-reroll"
            onClick={handleReroll}
            disabled={disabled || !canAffordReroll}
            title={rerollTooltip}
            aria-label={t("a11y.rerollShopOffers", { cost: currentRerollCost })}
          >
            {t("shop.reroll", { cost: currentRerollCost })}
          </Button>
          <ul
            className="flex min-w-0 flex-1 flex-col gap-3"
            aria-label={t("a11y.itemsForSale")}
          >
            {offers.map((offer, idx) => {
              if (offer.kind === "pack") return null;
              return renderOffer(offer, idx);
            })}
          </ul>
        </div>
        <div className="grid items-stretch gap-3 md:grid-cols-2">
          <section
            className="flex flex-col gap-2 rounded-lg border border-advisor/40 bg-advisor/10 p-3"
            data-testid="shop-voucher"
            aria-label={t("a11y.vouchersForAnte")}
          >
            <h3 className={cn(SECTION_HEADING, "text-advisor")}>
              {vouchers.length === 1
                ? t("shop.voucherHeadingOne")
                : t("shop.voucherHeadingOther")}
            </h3>
            {canOverrideVoucher && (
              <select
                className="cursor-pointer self-start rounded-md border border-border bg-raised px-2 py-1 text-xs text-ink hover:border-advisor focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                data-testid="shop-voucher-override"
                aria-label={t("a11y.overrideVoucherDev")}
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
            {!adminMode && vouchers.length > 0 && (
              <span
                className="self-start text-xs font-semibold text-advisor"
                data-testid="shop-voucher-current"
              >
                {localizedVoucherName(i18n.language, vouchers[0].id, vouchers[0].name)}
              </span>
            )}
            {vouchers.length === 0 ? (
              <p
                className="text-xs text-muted italic"
                data-testid="shop-voucher-empty"
              >
                {t("shop.noVoucherThisAnte")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {vouchers.map((voucher, idx) => {
                  const sold = soldVoucherIds.has(voucher.id);
                  const voucherName = localizedVoucherName(
                    i18n.language,
                    voucher.id,
                    voucher.name,
                  );
                  const btn = resolveVoucherButton(
                    t,
                    i18n.language,
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
                      className={cn(
                        "grid grid-cols-[1fr_auto_auto] items-center gap-x-3 gap-y-1 transition-opacity",
                        sold && "opacity-45",
                      )}
                      data-voucher-id={voucher.id}
                      data-sold={sold || undefined}
                      data-testid={`shop-voucher-${idx}`}
                    >
                      <span
                        className="col-start-1 row-start-1 font-semibold"
                        data-shop-voucher-name=""
                      >
                        {voucherName}
                      </span>
                      <span className="col-span-3 row-start-2 text-xs text-muted">
                        {localizedVoucherDescription(
                          i18n.language,
                          voucher.id,
                          voucher.description,
                        )}
                      </span>
                      <span className="col-start-2 row-start-1 font-bold text-money">
                        ${displayPrice}
                      </span>
                      <Button
                        variant="advisor"
                        size="sm"
                        className="col-start-3 row-start-1"
                        data-testid={`shop-voucher-buy-${idx}`}
                        disabled={disabled || btn.disabled}
                        title={disabled ? lockTooltip : btn.title}
                        aria-label={t("a11y.buyOffer", { label: btn.label, name: voucherName })}
                        onClick={() => onBuyVoucher(idx)}
                      >
                        {btn.label}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
          <section
            className="flex flex-col gap-2 rounded-lg border border-money/40 bg-money/10 p-3"
            data-testid="shop-packs"
            aria-label={t("a11y.boosterPacksForSale")}
          >
            <h3 className={cn(SECTION_HEADING, "text-money")}>
              {t("shop.boosterPacks")}
            </h3>
            <ul
              className="flex flex-col gap-2"
              aria-label={t("a11y.packsForSale")}
            >
              {offers.map((offer, idx) => {
                if (offer.kind !== "pack") return null;
                return renderOffer(offer, idx);
              })}
            </ul>
          </section>
        </div>
        <Suspense fallback={null}>
          <ShopSuggestion
            money={money}
            equippedJokerCount={equippedJokerCount}
            jokerCapacity={jokerCapacity}
            consumableCount={consumableCount}
            consumableCapacity={consumableCapacity}
            offers={offers}
            vouchers={vouchers}
            soldVoucherIds={soldVoucherIds}
            ownedVoucherIds={ownedVoucherIds}
            rerollCost={currentRerollCost}
            disabled={disabled}
            onBuy={onBuy}
            onBuyVoucher={onBuyVoucher}
            onApplyReroll={handleReroll}
            onNext={onNext}
            triggerContainer={suggestSlot}
          />
        </Suspense>
        <div
          className="flex flex-wrap items-center justify-center gap-3"
          data-testid="shop-actions"
        >
          <div className="contents" ref={setSuggestSlot} />
          <Button
            className="min-w-25"
            onClick={onNext}
            disabled={disabled}
            title={disabled ? lockTooltip : undefined}
            autoFocus
          >
            {t("shop.nextRound")}
          </Button>
        </div>
      </Panel>
    </section>
    </RenderProfiler>
  );
}
