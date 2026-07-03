import "./RoundWonModal.css";
import { useTranslation } from "react-i18next";
import {
  GOLD_HELD_BONUS_PER_CARD,
  INTEREST_CAP,
  INTEREST_RATE_PER,
  REMAINING_HAND_BONUS,
} from "../../scoring/payout";
import Modal from "../system/Modal";
import { formatNumber } from "../../utils/formatNumber";

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
  // round. Also excludes end-of-round joker money (e.g. Cloud 9,
  // Delayed Gratification) — joker EOR income is not subject to interest.
  readonly interestWallet: number;
  readonly interest: number;
  readonly goldHeldCount: number;
  readonly remainingHandsCount: number;
  readonly remainingDiscardsCount?: number;
  readonly remainingHandsBonusPerUnit?: number;
  readonly usesHandsAndDiscardsBonus?: boolean;
  readonly endOfRoundJokerSteps?: ReadonlyArray<RoundWonJokerPayoutStep>;
  readonly savedByMrBones?: boolean;
}

interface RoundWonModalProps {
  info: RoundWonInfo;
  onContinue: () => void;
}

export default function RoundWonModal({ info, onContinue }: RoundWonModalProps) {
  const { t } = useTranslation();
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
    savedByMrBones = false,
  } = info;
  const beatBy = roundScore - requiredScore;
  const shortBy = Math.max(0, requiredScore - roundScore);
  const goldBonus = goldHeldCount * GOLD_HELD_BONUS_PER_CARD;
  const bonusUnits = usesHandsAndDiscardsBonus
    ? remainingHandsCount + remainingDiscardsCount
    : remainingHandsCount;
  const remainingHandsBonus = bonusUnits * remainingHandsBonusPerUnit;
  const jokerSteps = endOfRoundJokerSteps ?? [];
  const jokerTotal = jokerSteps.reduce((sum, step) => sum + step.moneyEarned, 0);
  const total =
    baseReward + interest + goldBonus + remainingHandsBonus + jokerTotal;
  const interestLabel = t("roundEnd.interest", {
    per: INTEREST_RATE_PER,
    cap: INTEREST_CAP,
    wallet: interestWallet,
  });
  const goldLabel = t("roundEnd.goldCards", {
    count: goldHeldCount,
    per: GOLD_HELD_BONUS_PER_CARD,
  });
  const handsLabel = usesHandsAndDiscardsBonus
    ? t("roundEnd.remainingHandsAndDiscards", {
        units: bonusUnits,
        per: remainingHandsBonusPerUnit,
      })
    : t("roundEnd.remainingHands", {
        units: bonusUnits,
        per: remainingHandsBonusPerUnit,
      });
  return (
    <Modal
      onClose={onContinue}
      labelledBy="round-won-title"
      accent={savedByMrBones ? "neutral" : "success"}
      className="round-won-modal"
    >
        <h2
          id="round-won-title"
          className={
            savedByMrBones
              ? "round-won-title round-won-title--saved"
              : "round-won-title"
          }
        >
          <span aria-hidden="true">{savedByMrBones ? "💀 " : "🏆 "}</span>
          {savedByMrBones ? t("roundEnd.savedTitle") : t("roundEnd.wonTitle")}
        </h2>
        {savedByMrBones && (
          <p className="round-won-saved-note" data-testid="round-won-saved-note">
            {t("roundEnd.mrBonesConsumed")}
          </p>
        )}
        <dl className="round-won-stats">
          <div className="stat-pill round-won-stat">
            <dt>{t("roundEnd.roundScore")}</dt>
            <dd data-testid="round-won-score">{formatNumber(roundScore)}</dd>
          </div>
          <div className="stat-pill round-won-stat">
            <dt>{t("roundEnd.requiredScore")}</dt>
            <dd data-testid="round-won-required">{formatNumber(requiredScore)}</dd>
          </div>
          {savedByMrBones ? (
            <div className="stat-pill round-won-stat round-won-stat-saved">
              <dt>{t("roundEnd.shortBy")}</dt>
              <dd data-testid="round-won-short-by">{formatNumber(shortBy)}</dd>
            </div>
          ) : (
            <div className="stat-pill round-won-stat round-won-stat-beat">
              <dt>{t("roundEnd.beatBy")}</dt>
              <dd data-testid="round-won-beat-by">+{formatNumber(beatBy)}</dd>
            </div>
          )}
        </dl>
        <div className="round-won-payout">
          <h3 className="round-won-payout-title">{t("roundEnd.moneyWon")}</h3>
          <dl className="round-won-payout-list">
            <div className="round-won-payout-row">
              <dt>{t("roundEnd.baseReward")}</dt>
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
              <dt>{t("roundEnd.total")}</dt>
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
          {t("roundEnd.continue")}
        </button>
    </Modal>
  );
}
