import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  buildShopAdvicePlan,
  type ShopSuggestionAction,
} from "../../ai/advisor/shopAdvicePlan";
import {
  useSuggestion,
  type SuggestionDeps,
} from "../../ai/advisor/useSuggestion";
import { setHumanPlayRecordingSuppressed } from "../../ai/humanPlayWiring";
import type { ShopItem } from "../../items/shop";
import type { Voucher, VoucherId } from "../../items/vouchers";
import { useGame } from "../../store/game";
import SuggestionAdvice from "../advisor/SuggestionAdvice";
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
  const ante = useGame((s) => s.ante);
  const jokers = useGame((s) => s.jokers);
  const consumables = useGame((s) => s.consumables);
  const { state, suggest, reset } = useSuggestion<ShopSuggestionAction>(
    () =>
      buildShopAdvicePlan({
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
      }),
    props.suggestionDeps,
  );

  function apply(): void {
    if (state.phase !== "ready") return;
    const action = state.actions[state.advice.recommendationIndex];
    if (action === undefined) return;
    setHumanPlayRecordingSuppressed(true);
    try {
      if (action.kind === "buy") props.onBuy(action.offerIdx);
      else if (action.kind === "buy-voucher") props.onBuyVoucher(action.voucherIdx);
      else if (action.kind === "reroll") props.onApplyReroll();
      else props.onNext();
    } finally {
      setHumanPlayRecordingSuppressed(false);
    }
    reset();
  }

  const trigger = (
    <button
      type="button"
      className="btn shop-suggest-button"
      data-testid="shop-suggest"
      disabled={props.disabled || state.phase === "loading"}
      aria-label={t("advisor.suggestShopButton")}
      onClick={() => void suggest()}
    >
      <span aria-hidden="true">💡 </span>
      {t("advisor.suggestShopButton")}
    </button>
  );

  return (
    <div className="shop-suggestion">
      {props.triggerContainer
        ? createPortal(trigger, props.triggerContainer)
        : trigger}
      <SuggestionAdvice
        state={state}
        onApply={apply}
        onDismiss={reset}
        onRetry={() => void suggest()}
      />
    </div>
  );
}
