import "./NewRunScreen.css";
import { useState } from "react";
import { createPortal } from "react-dom";
import {
  DEFAULT_STAKE,
  createStakeCatalog,
  type Stake,
} from "../../items/stakes";

interface NewRunScreenProps {
  initialStake?: Stake;
  onConfirm: (selection: { stake: Stake }) => void;
}

const STAKES = createStakeCatalog().filter((s) => s.implemented);

export default function NewRunScreen({
  initialStake = DEFAULT_STAKE,
  onConfirm,
}: NewRunScreenProps) {
  const [stake, setStake] = useState<Stake>(initialStake);
  const selectedSpec = STAKES.find((s) => s.id === stake) ?? STAKES[0];

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
          <div className="new-run-deck-placeholder">
            <span className="new-run-deck-name">Red Deck</span>
            <span className="new-run-deck-hint">Deck selection coming soon</span>
          </div>
        </section>
        <section
          className="new-run-section new-run-section-stake"
          aria-labelledby="new-run-stake-label"
        >
          <h3 id="new-run-stake-label" className="new-run-section-label">
            Stake
          </h3>
          <ul
            className="new-run-stake-grid"
            role="radiogroup"
            aria-label="Stake difficulty"
          >
            {STAKES.map((spec) => {
              const isSelected = spec.id === stake;
              return (
                <li key={spec.id} className="new-run-stake-cell">
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
                </li>
              );
            })}
          </ul>
          <p
            className="new-run-stake-description"
            data-testid="new-run-stake-description"
            aria-live="polite"
          >
            <strong>{selectedSpec.name}:</strong> {selectedSpec.description}
          </p>
        </section>
        <div className="new-run-actions">
          <button
            type="button"
            className="new-run-confirm"
            data-testid="new-run-confirm"
            onClick={() => onConfirm({ stake })}
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
