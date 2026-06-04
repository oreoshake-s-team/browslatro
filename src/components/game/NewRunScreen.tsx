import "./NewRunScreen.css";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  DEFAULT_STAKE,
  createStakeCatalog,
  type Stake,
} from "../../items/stakes";
import {
  DEFAULT_DECK,
  createDeckCatalog,
  type Deck,
} from "../../items/decks";

interface NewRunScreenProps {
  initialStake?: Stake;
  initialDeck?: Deck;
  onConfirm: (selection: { stake: Stake; deck: Deck }) => void;
}

const STAKES = createStakeCatalog().filter((s) => s.implemented);
const DECKS = createDeckCatalog().filter((d) => d.implemented);

export default function NewRunScreen({
  initialStake = DEFAULT_STAKE,
  initialDeck = DEFAULT_DECK,
  onConfirm,
}: NewRunScreenProps) {
  const [stake, setStake] = useState<Stake>(initialStake);
  const [deck, setDeck] = useState<Deck>(initialDeck);
  const selectedStakeSpec = STAKES.find((s) => s.id === stake) ?? STAKES[0];
  const selectedDeckSpec = DECKS.find((d) => d.id === deck) ?? DECKS[0];

  return createPortal(
    <div
      className="new-run-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-run-title"
    >
      <div className="new-run-modal">
        <h2 id="new-run-title" className="new-run-title">
          Start New Run
        </h2>
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
                    onClick={() => setDeck(spec.id)}
                  >
                    <span className="new-run-deck-name">{spec.name}</span>
                  </button>
                </div>
              );
            })}
          </div>
          <p
            className="new-run-deck-description"
            data-testid="new-run-deck-description"
            aria-live="polite"
          >
            <strong>{selectedDeckSpec.name}:</strong> {selectedDeckSpec.description}
          </p>
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
          <p
            className="new-run-stake-description"
            data-testid="new-run-stake-description"
            aria-live="polite"
          >
            <strong>{selectedStakeSpec.name}:</strong> {selectedStakeSpec.description}
          </p>
        </section>
        <div className="new-run-actions">
          <button
            type="button"
            className="new-run-confirm"
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
