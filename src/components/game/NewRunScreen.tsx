import "./NewRunScreen.css";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DeckTooltip from "./DeckTooltip";
import { useFocusTrap } from "../system/useFocusTrap";
import {
  DEFAULT_STAKE,
  createStakeCatalog,
  getActiveStakes,
  getStakeSpec,
  type Stake,
} from "../../items/stakes";
import {
  DEFAULT_DECK,
  createDeckCatalog,
  type Deck,
} from "../../items/decks";
import type { VoucherId } from "../../items/vouchers";
import {
  computeStartingDiscards,
  computeStartingHands,
} from "../../run/roundSetup";

interface NewRunScreenProps {
  initialStake?: Stake;
  initialDeck?: Deck;
  onConfirm: (selection: { stake: Stake; deck: Deck }) => void;
}

const STAKES = createStakeCatalog().filter((s) => s.implemented);
const DECKS = createDeckCatalog().filter((d) => d.implemented);
const NO_VOUCHERS: ReadonlySet<VoucherId> = new Set();

export default function NewRunScreen({
  initialStake = DEFAULT_STAKE,
  initialDeck = DEFAULT_DECK,
  onConfirm,
}: NewRunScreenProps) {
  const [stake, setStake] = useState<Stake>(initialStake);
  const [deck, setDeck] = useState<Deck>(initialDeck);
  const deckTooltipIdBase = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  useFocusTrap(overlayRef);
  const [deckTooltip, setDeckTooltip] = useState<{
    readonly id: Deck;
    readonly rect: DOMRect;
  } | null>(null);

  useEffect(() => {
    if (deckTooltip === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDeckTooltip(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deckTooltip]);

  function openDeckTooltip(id: Deck, el: HTMLElement) {
    setDeckTooltip({ id, rect: el.getBoundingClientRect() });
  }

  function closeDeckTooltip(id: Deck) {
    setDeckTooltip((prev) => (prev?.id === id ? null : prev));
  }

  const resourceCtx = {
    blind: 1 as const,
    boss: null,
    ownedVoucherIds: NO_VOUCHERS,
    deck,
    jokers: [],
    stake,
  };
  const startingHands = computeStartingHands(resourceCtx);
  const startingDiscards = computeStartingDiscards(resourceCtx);

  return createPortal(
    <div
      ref={overlayRef}
      className="new-run-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-run-title"
    >
      <div className="new-run-modal">
        <div className="new-run-header">
          <h2 id="new-run-title" className="new-run-title">
            Start New Run
          </h2>
          <p
            className="new-run-header-preview"
            aria-label="Starting resources for this run"
          >
            <span
              className="new-run-header-preview-pair"
              data-testid="new-run-preview-hands"
            >
              <span
                className="new-run-header-preview-value"
                aria-live="polite"
              >
                {startingHands}
              </span>{" "}
              starting hands
            </span>
            <span aria-hidden="true" className="new-run-header-preview-sep">
              ·
            </span>
            <span
              className="new-run-header-preview-pair"
              data-testid="new-run-preview-discards"
            >
              <span
                className="new-run-header-preview-value"
                aria-live="polite"
              >
                {startingDiscards}
              </span>{" "}
              starting discards
            </span>
          </p>
        </div>
        <section
          className="new-run-section new-run-section-deck"
          aria-labelledby="new-run-deck-label"
        >
          <h3 id="new-run-deck-label" className="new-run-section-label">
            Deck
          </h3>
          <div
            className="new-run-deck-grid"
            role="radiogroup"
            aria-label="Deck variant"
          >
            {DECKS.map((spec) => {
              const isSelected = spec.id === deck;
              const tooltipId = `${deckTooltipIdBase}-${spec.id}`;
              const open = deckTooltip?.id === spec.id;
              return (
                <div key={spec.id} className="new-run-deck-cell">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`new-run-deck-tile new-run-deck-tile-${spec.id}${
                      isSelected ? " new-run-deck-tile-selected" : ""
                    }`}
                    data-testid={`new-run-deck-${spec.id}`}
                    data-selected={isSelected || undefined}
                    aria-describedby={open ? tooltipId : undefined}
                    onMouseEnter={(e) => openDeckTooltip(spec.id, e.currentTarget)}
                    onMouseLeave={() => closeDeckTooltip(spec.id)}
                    onFocus={(e) => openDeckTooltip(spec.id, e.currentTarget)}
                    onBlur={() => closeDeckTooltip(spec.id)}
                    onClick={() => setDeck(spec.id)}
                  >
                    <span className="new-run-deck-name">{spec.name}</span>
                    {open && deckTooltip && (
                      <DeckTooltip
                        id={tooltipId}
                        spec={spec}
                        anchorRect={deckTooltip.rect}
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
        <section
          className="new-run-section new-run-section-stake"
          aria-labelledby="new-run-stake-label"
        >
          <h3 id="new-run-stake-label" className="new-run-section-label">
            Stake
          </h3>
          <div
            className="new-run-stake-grid"
            role="radiogroup"
            aria-label="Stake difficulty"
          >
            {STAKES.map((spec) => {
              const isSelected = spec.id === stake;
              return (
                <div key={spec.id} className="new-run-stake-cell">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={`new-run-stake-tile new-run-stake-tile-${spec.id}${
                      isSelected ? " new-run-stake-tile-selected" : ""
                    }`}
                    data-testid={`new-run-stake-${spec.id}`}
                    data-selected={isSelected || undefined}
                    onClick={() => setStake(spec.id)}
                  >
                    <span className="new-run-stake-name">{spec.name}</span>
                  </button>
                </div>
              );
            })}
          </div>
          <ul
            className="new-run-stake-description"
            data-testid="new-run-stake-description"
            aria-live="polite"
            aria-label="Active stake effects"
          >
            {getActiveStakes(stake).slice().reverse().map((id) => {
              const spec = getStakeSpec(id);
              const isSelected = id === stake;
              return (
                <li
                  key={id}
                  className={`new-run-stake-effect new-run-stake-effect-${id}${
                    isSelected ? " new-run-stake-effect-selected" : ""
                  }`}
                  data-testid={`new-run-stake-effect-${id}`}
                  data-selected={isSelected || undefined}
                >
                  <span className={`new-run-stake-effect-name new-run-stake-effect-name-${id}`}>
                    {spec.name}
                  </span>
                  <span className="new-run-stake-effect-text">{spec.description}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <div className="new-run-actions">
          <button
            type="button"
            className="btn btn--primary new-run-confirm"
            data-testid="new-run-confirm"
            onClick={() => onConfirm({ stake, deck })}
            autoFocus
          >
            Start Run →
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
