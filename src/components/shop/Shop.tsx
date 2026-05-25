import "./Shop.css";
import { useState } from "react";
import { createPortal } from "react-dom";
import type { Joker } from "../../jokers";
import { MAX_JOKERS } from "../../jokers";
import { rerollCostFor } from "../../shop";
import { useEscapeToClose } from "../system/useEscapeToClose";

export interface ShopOffer {
  readonly joker: Joker;
  readonly sold: boolean;
}

interface ShopProps {
  money: number;
  equippedJokerCount: number;
  offers: ReadonlyArray<ShopOffer>;
  pricePerJoker: number;
  onBuy: (offerIdx: number) => void;
  onReroll: (cost: number) => void;
  onNext: () => void;
}

type BuyButtonState =
  | { kind: "sold" }
  | { kind: "slots-full" }
  | { kind: "unaffordable" }
  | { kind: "available" };

function resolveBuyState(
  offer: ShopOffer,
  money: number,
  equippedCount: number,
  price: number,
): BuyButtonState {
  if (offer.sold) return { kind: "sold" };
  if (equippedCount >= MAX_JOKERS) return { kind: "slots-full" };
  if (money < price) return { kind: "unaffordable" };
  return { kind: "available" };
}

function buyButtonLabel(state: BuyButtonState, price: number): string {
  switch (state.kind) {
    case "sold":
      return "Sold";
    case "slots-full":
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
    case "unaffordable":
      return "Not enough money";
    case "available":
      return undefined;
  }
}

export default function Shop({
  money,
  equippedJokerCount,
  offers,
  pricePerJoker,
  onBuy,
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
        <ul className="shop-offers" aria-label="Jokers for sale">
          {offers.map((offer, idx) => {
            const state = resolveBuyState(
              offer,
              money,
              equippedJokerCount,
              pricePerJoker,
            );
            const disabled = state.kind !== "available";
            const tooltip = buyButtonTooltip(state);
            return (
              <li
                key={offer.joker.id}
                className={`shop-offer${
                  offer.sold ? " shop-offer-sold" : ""
                }`}
                data-testid={`shop-offer-${idx}`}
              >
                <span className="shop-offer-name">{offer.joker.name}</span>
                <span className="shop-offer-description">
                  {offer.joker.description}
                </span>
                <span className="shop-offer-price">${pricePerJoker}</span>
                <button
                  type="button"
                  className="shop-offer-buy"
                  disabled={disabled}
                  title={tooltip}
                  aria-label={`${buyButtonLabel(state, pricePerJoker)}: ${offer.joker.name}`}
                  onClick={() => onBuy(idx)}
                >
                  {buyButtonLabel(state, pricePerJoker)}
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
