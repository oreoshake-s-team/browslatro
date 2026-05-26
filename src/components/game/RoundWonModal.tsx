import "./RoundWonModal.css";
import { createPortal } from "react-dom";
import {
  GOLD_HELD_BONUS_PER_CARD,
  INTEREST_CAP,
  INTEREST_RATE_PER,
  REMAINING_HAND_BONUS,
} from "../../payout";
import { useEscapeToClose } from "../system/useEscapeToClose";

export interface RoundWonInfo {
  readonly roundScore: number;
  readonly requiredScore: number;
  readonly baseReward: number;
  readonly walletAtPayout: number;
  readonly interest: number;
  readonly goldHeldCount: number;
  readonly remainingHandsCount: number;
}

interface RoundWonModalProps {
  info: RoundWonInfo;
  onContinue: () => void;
}

export default function RoundWonModal({ info, onContinue }: RoundWonModalProps) {
  const {
    roundScore,
    requiredScore,
    baseReward,
    walletAtPayout,
    interest,
    goldHeldCount,
    remainingHandsCount,
  } = info;
  const beatBy = roundScore - requiredScore;
  const goldBonus = goldHeldCount * GOLD_HELD_BONUS_PER_CARD;
  const remainingHandsBonus = remainingHandsCount * REMAINING_HAND_BONUS;
  const total = baseReward + interest + goldBonus + remainingHandsBonus;
  const interestLabel = `Interest ($1 per $${INTEREST_RATE_PER}, max $${INTEREST_CAP}) on $${walletAtPayout}`;
  const goldLabel = `Gold cards (${goldHeldCount} × $${GOLD_HELD_BONUS_PER_CARD})`;
  const handsLabel = `Remaining hands (${remainingHandsCount} × $${REMAINING_HAND_BONUS})`;
  useEscapeToClose(onContinue, true);

  return createPortal(
    <div
      className="round-won-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="round-won-title"
    >
      <div
        className="round-won-modal"
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
          <dl className="round-won-payout-list">
            <div className="round-won-payout-row">
              <dt>Base reward</dt>
              <dd data-testid="round-won-base-reward">${baseReward}</dd>
            </div>
            {goldHeldCount > 0 && (
              <div className="round-won-payout-row">
                <dt data-testid="round-won-gold-label">{goldLabel}</dt>
                <dd data-testid="round-won-gold">+${goldBonus}</dd>
              </div>
            )}
            {remainingHandsCount > 0 && (
              <div className="round-won-payout-row">
                <dt data-testid="round-won-hands-label">{handsLabel}</dt>
                <dd data-testid="round-won-hands">+${remainingHandsBonus}</dd>
              </div>
            )}
            <div className="round-won-payout-row">
              <dt data-testid="round-won-interest-label">{interestLabel}</dt>
              <dd data-testid="round-won-interest">+${interest}</dd>
            </div>
            <div className="round-won-payout-row round-won-payout-total">
              <dt>Total</dt>
              <dd data-testid="round-won-total">${total}</dd>
            </div>
          </dl>
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
