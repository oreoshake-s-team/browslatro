import "./Shop.css";
import { useState } from "react";
import { createPortal } from "react-dom";
import { MAX_JOKERS } from "../../jokers";
import { rerollCostFor, type ShopItem } from "../../shop";
import { useEscapeToClose } from "../system/useEscapeToClose";

interface ShopProps {
  money: number;
  equippedJokerCount: number;
  offers: ReadonlyArray<ShopItem>;
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
  offer: ShopItem,
  money: number,
  equippedJokerCount: number,
): BuyButtonState {
  if (offer.sold) return { kind: "sold" };
  if (offer.kind === "joker" && equippedJokerCount >= MAX_JOKERS) {
    return { kind: "slots-full" };
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

function offerSubject(offer: ShopItem): {
  readonly id: string;
  readonly name: string;
  readonly description: string;
} {
  return offer.kind === "joker" ? offer.joker : offer.planet;
}

export default function Shop({
  money,
  equippedJokerCount,
  offers,
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
        <ul className="shop-offers" aria-label="Items for sale">
          {offers.map((offer, idx) => {
            const state = resolveBuyState(offer, money, equippedJokerCount);
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
