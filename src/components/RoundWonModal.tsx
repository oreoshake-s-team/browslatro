import "./RoundWonModal.css";
import { createPortal } from "react-dom";

export interface RoundWonInfo {
  readonly roundScore: number;
  readonly requiredScore: number;
  readonly baseReward: number;
}

interface RoundWonModalProps {
  info: RoundWonInfo;
  onContinue: () => void;
}

export default function RoundWonModal({ info, onContinue }: RoundWonModalProps) {
  const { roundScore, requiredScore, baseReward } = info;
  const beatBy = roundScore - requiredScore;

  return createPortal(
    <div
      className="round-won-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="round-won-title"
    >
      <div
        className="round-won-modal"
        // Clicks inside the modal must not propagate to a future overlay-close
        // handler. The overlay itself does not close on click in this modal;
        // the player must click Continue.
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="round-won-title" className="round-won-title">
          🏆 Round Won!
        </h2>
        <dl className="round-won-stats">
          <div className="round-won-stat">
            <dt>Round score</dt>
            <dd data-testid="round-won-score">{roundScore}</dd>
          </div>
          <div className="round-won-stat">
            <dt>Required score</dt>
            <dd data-testid="round-won-required">{requiredScore}</dd>
          </div>
          <div className="round-won-stat round-won-stat-beat">
            <dt>Beat by</dt>
            <dd data-testid="round-won-beat-by">+{beatBy}</dd>
          </div>
        </dl>
        <div className="round-won-payout">
          <h3 className="round-won-payout-title">Money won</h3>
          <ul className="round-won-payout-list">
            <li className="round-won-payout-row">
              <span>Base reward</span>
              <span data-testid="round-won-base-reward">${baseReward}</span>
            </li>
            <li className="round-won-payout-row round-won-payout-total">
              <span>Total</span>
              <span data-testid="round-won-total">${baseReward}</span>
            </li>
          </ul>
        </div>
        <button
          type="button"
          className="round-won-continue"
          onClick={onContinue}
          autoFocus
        >
          Continue →
        </button>
      </div>
    </div>,
    document.body,
  );
}
