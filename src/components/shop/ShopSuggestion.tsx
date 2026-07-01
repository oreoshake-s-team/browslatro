import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  buildShopAdvicePlan,
  type ShopSuggestionAction,
} from "../../ai/advisor/shopAdvicePlan";
import { buildShopPolicyFeedbackEvent } from "../../ai/advisor/adviceFeedback";
import {
  buildShopRolloutState,
  shopBuildFromState,
} from "../../ai/advisor/shopRolloutCapture";
import {
  clearShopAdvice,
  rememberShopAdvice,
} from "../../ai/advisor/shownShopAdvice";
import { sharedShopRanker } from "../../ai/advisor/shopRanker";
import type { DownloadProgress } from "../../ai/policy";
import type { ShopAdviceCandidate } from "../../ai/advisor/types";
import {
  type ContextAdviceCandidate,
  useSuggestion,
  type SuggestionDeps,
} from "../../ai/advisor/useSuggestion";
import {
  captureAdviceFeedback,
  setHumanPlayRecordingSuppressed,
} from "../../ai/humanPlayWiring";
import { useConsumableActions } from "../../hooks/useConsumableActions";
import type { ShopItem } from "../../items/shop";
import type { Voucher, VoucherId } from "../../items/vouchers";
import { useGame } from "../../store/game";
import CoachAdvice from "../advisor/CoachAdvice";
import "./ShopSuggestion.css";

export interface ShopSuggestionProps {
  readonly money: number;
  readonly equippedJokerCount: number;
  readonly jokerCapacity: number;
  readonly consumableCount: number;
  readonly consumableCapacity: number;
  readonly offers: ReadonlyArray<ShopItem>;
  readonly vouchers: ReadonlyArray<Voucher>;
  readonly soldVoucherIds: ReadonlySet<VoucherId>;
  readonly ownedVoucherIds: ReadonlySet<VoucherId>;
  readonly rerollCost: number;
  readonly disabled: boolean;
  readonly onBuy: (offerIdx: number) => void;
  readonly onBuyVoucher: (voucherIdx: number) => void;
  readonly onApplyReroll: () => void;
  readonly onNext: () => void;
  readonly suggestionDeps?: SuggestionDeps;
  readonly triggerContainer?: HTMLElement | null;
}

export default function ShopSuggestion(
  props: ShopSuggestionProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const { useConsumable } = useConsumableActions();
  const ante = useGame((s) => s.ante);
  const round = useGame((s) => s.round);
  const jokers = useGame((s) => s.jokers);
  const consumables = useGame((s) => s.consumables);
  const shopRanker = sharedShopRanker();
  const [modelProgress, setModelProgress] = useState<DownloadProgress | null>(
    null,
  );
  const [revealed, setRevealed] = useState(false);
  const [feedbackRecorded, setFeedbackRecorded] = useState(false);
  const planInput = {
    money: props.money,
    ante,
    jokers,
    consumables,
    equippedJokerCount: props.equippedJokerCount,
    jokerCapacity: props.jokerCapacity,
    consumableCount: props.consumableCount,
    consumableCapacity: props.consumableCapacity,
    offers: props.offers,
    vouchers: props.vouchers,
    soldVoucherIds: props.soldVoucherIds,
    ownedVoucherIds: props.ownedVoucherIds,
    rerollCost: props.rerollCost,
  };
  const preRank = useCallback(
    (candidates: ReadonlyArray<ContextAdviceCandidate>) => {
      setModelProgress({ loaded: 0, total: null });
      void shopRanker
        .load((progress) => setModelProgress(progress))
        .finally(() => setModelProgress(null));
      return shopRanker
        .rankShop({
          money: props.money,
          ante,
          round,
          build: shopBuildFromState(useGame.getState()),
          candidates: candidates as ReadonlyArray<ShopAdviceCandidate>,
        })
        .then((ranked) => ranked[0] ?? null);
    },
    [shopRanker, props.money, ante, round],
  );
  const { state, coach, askAi, reset } = useSuggestion<ShopSuggestionAction>(
    () => buildShopAdvicePlan(planInput),
    props.suggestionDeps,
    preRank,
  );

  const onnxIndex = state.phase === "idle" ? null : state.onnxIndex;
  useEffect(() => {
    if (onnxIndex === null) return;
    const plan = buildShopAdvicePlan(planInput);
    if (plan === null) return;
    rememberShopAdvice({
      shop: plan.request.shop,
      candidates: plan.request.candidates,
      actions: plan.actions,
      recommendationIndex: onnxIndex,
      rollout: buildShopRolloutState(useGame.getState(), props.offers),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onnxIndex]);
  useEffect(() => () => clearShopAdvice(), []);

  function handleFeedback(correctedIndex: number | null): void {
    if (state.phase === "idle" || state.onnxIndex === null) return;
    const plan = buildShopAdvicePlan(planInput);
    if (plan === null) return;
    captureAdviceFeedback(
      useGame.getState(),
      buildShopPolicyFeedbackEvent(
        plan.request.shop,
        plan.request.candidates,
        state.onnxIndex,
        correctedIndex,
        "explicit",
        buildShopRolloutState(useGame.getState(), props.offers),
      ),
    );
    clearShopAdvice();
    setFeedbackRecorded(true);
    const corrected =
      correctedIndex !== null ? state.actions[correctedIndex] : undefined;
    if (corrected !== undefined) {
      applyAction(corrected);
    } else {
      reset();
      setRevealed(false);
    }
  }

  function applyAction(action: ShopSuggestionAction): void {
    setHumanPlayRecordingSuppressed(true);
    try {
      if (action.kind === "buy") props.onBuy(action.offerIdx);
      else if (action.kind === "buy-voucher") props.onBuyVoucher(action.voucherIdx);
      else if (action.kind === "use-consumable") {
        if (!action.requiresTargets) useConsumable(action.consumableIdx);
      } else if (action.kind === "reroll") props.onApplyReroll();
      else props.onNext();
    } finally {
      setHumanPlayRecordingSuppressed(false);
    }
    reset();
    setRevealed(false);
  }

  function apply(): void {
    if (state.phase === "idle") return;
    const action =
      state.onnxIndex !== null ? state.actions[state.onnxIndex] : undefined;
    if (action === undefined) return;
    applyAction(action);
  }

  function handleAgree(): void {
    if (state.phase === "idle" || state.onnxIndex === null) return;
    const plan = buildShopAdvicePlan(planInput);
    if (plan === null) return;
    captureAdviceFeedback(
      useGame.getState(),
      buildShopPolicyFeedbackEvent(
        plan.request.shop,
        plan.request.candidates,
        state.onnxIndex,
        state.onnxIndex,
        "explicit",
        buildShopRolloutState(useGame.getState(), props.offers),
        "good",
      ),
    );
    clearShopAdvice();
    setFeedbackRecorded(true);
    apply();
  }

  const recommended =
    state.phase !== "idle" && state.onnxIndex !== null
      ? state.actions[state.onnxIndex]
      : undefined;
  const applyBlockedReason =
    recommended?.kind === "use-consumable" && recommended.requiresTargets
      ? t("advisor.useDuringBlind")
      : undefined;

  const trigger = (
    <button
      type="button"
      className="btn btn--advisor shop-action-button"
      data-testid="coach-trigger"
      disabled={props.disabled}
      onClick={() => {
        setFeedbackRecorded(false);
        setRevealed(true);
        void coach();
      }}
    >
      <span aria-hidden="true">⚡ </span>
      {t("advisor.coachTip")}
    </button>
  );

  return (
    <div className="shop-suggestion">
      {!revealed && feedbackRecorded && (
        <p
          className="shop-suggestion-recorded"
          role="status"
          data-testid="coach-feedback-recorded"
        >
          {t("advisor.feedbackRecorded")}
        </p>
      )}
      {!revealed &&
        (props.triggerContainer
          ? createPortal(trigger, props.triggerContainer)
          : trigger)}
      {revealed && (
        <CoachAdvice
          state={state}
          onFeedback={handleFeedback}
          onAgree={handleAgree}
          feedbackSubmitLabel={t("advisor.feedbackDoInstead")}
          modelProgress={modelProgress}
          onApply={apply}
          applyDisabled={applyBlockedReason !== undefined}
          applyDisabledReason={applyBlockedReason}
          onAskAi={() => void askAi()}
          onDismiss={() => {
            reset();
            setRevealed(false);
          }}
        />
      )}
    </div>
  );
}
