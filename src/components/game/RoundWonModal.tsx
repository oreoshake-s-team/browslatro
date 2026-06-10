import "./RoundWonModal.css";
import { useRef } from "react";
import { createPortal } from "react-dom";
import {
  GOLD_HELD_BONUS_PER_CARD,
  INTEREST_CAP,
  INTEREST_RATE_PER,
  REMAINING_HAND_BONUS,
} from "../../scoring/payout";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useFocusTrap } from "../system/useFocusTrap";

export interface RoundWonJokerPayoutStep {
  readonly jokerId: string;
  readonly jokerName: string;
  readonly moneyEarned: number;
}

export interface RoundWonInfo {
  readonly roundScore: number;
  readonly requiredScore: number;
  readonly baseReward: number;
  readonly walletAtPayout: number;
  // Wallet used to derive `interest`. Excludes the remaining-hands bonus —
  // the player shouldn't earn interest on a tip they just received this
  // round (see #353). Also excludes end-of-round joker money (e.g. Cloud 9,
  // Delayed Gratification) — joker EOR income is not subject to interest
  // (see #620).
  readonly interestWallet: number;
  readonly interest: number;
  readonly goldHeldCount: number;
  readonly remainingHandsCount: number;
  readonly remainingDiscardsCount?: number;
  readonly remainingHandsBonusPerUnit?: number;
  readonly usesHandsAndDiscardsBonus?: boolean;
  readonly endOfRoundJokerSteps?: ReadonlyArray<RoundWonJokerPayoutStep>;
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
    interestWallet,
    interest,
    goldHeldCount,
    remainingHandsCount,
    remainingDiscardsCount = 0,
    remainingHandsBonusPerUnit = REMAINING_HAND_BONUS,
    usesHandsAndDiscardsBonus = false,
    endOfRoundJokerSteps,
  } = info;
  const beatBy = roundScore - requiredScore;
  const goldBonus = goldHeldCount * GOLD_HELD_BONUS_PER_CARD;
  const bonusUnits = usesHandsAndDiscardsBonus
    ? remainingHandsCount + remainingDiscardsCount
    : remainingHandsCount;
  const remainingHandsBonus = bonusUnits * remainingHandsBonusPerUnit;
  const jokerSteps = endOfRoundJokerSteps ?? [];
  const jokerTotal = jokerSteps.reduce((sum, step) => sum + step.moneyEarned, 0);
  const total =
    baseReward + interest + goldBonus + remainingHandsBonus + jokerTotal;
  const interestLabel = `Interest ($1 per $${INTEREST_RATE_PER}, max $${INTEREST_CAP}) on $${interestWallet}`;
  const goldLabel = `Gold cards (${goldHeldCount} × $${GOLD_HELD_BONUS_PER_CARD})`;
  const handsLabel = usesHandsAndDiscardsBonus
    ? `Remaining hands + discards (${bonusUnits} × $${remainingHandsBonusPerUnit})`
    : `Remaining hands (${bonusUnits} × $${remainingHandsBonusPerUnit})`;
  useEscapeToClose(onContinue, true);
  const overlayRef = useRef<HTMLDivElement>(null);
  useFocusTrap(overlayRef);

  return createPortal(
    <div
      ref={overlayRef}
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
            {bonusUnits > 0 && (
              <div className="round-won-payout-row">
                <dt data-testid="round-won-hands-label">{handsLabel}</dt>
                <dd data-testid="round-won-hands">+${remainingHandsBonus}</dd>
              </div>
            )}
            {!usesHandsAndDiscardsBonus && (
              <div className="round-won-payout-row">
                <dt data-testid="round-won-interest-label">{interestLabel}</dt>
                <dd data-testid="round-won-interest">+${interest}</dd>
              </div>
            )}
            {jokerSteps.map((step) => (
              <div
                key={step.jokerId}
                className="round-won-payout-row"
                data-testid={`round-won-joker-row-${step.jokerId}`}
              >
                <dt
                  data-testid={`round-won-joker-label-${step.jokerId}`}
                >
                  {step.jokerName}
                </dt>
                <dd
                  data-testid={`round-won-joker-amount-${step.jokerId}`}
                >
                  {step.moneyEarned < 0
                    ? `-$${Math.abs(step.moneyEarned)}`
                    : `+$${step.moneyEarned}`}
                </dd>
              </div>
            ))}
            <div className="round-won-payout-row round-won-payout-total">
              <dt>Total</dt>
              <dd data-testid="round-won-total">${total}</dd>
            </div>
          </dl>
        </div>
        <button
          type="button"
          className="btn btn--primary round-won-continue"
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
