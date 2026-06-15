import { useCallback, useEffect, useState } from "react";
import {
  buildShopAdvicePlan,
  type ShopSuggestionAction,
} from "../../ai/advisor/shopAdvicePlan";
import { sharedShopRanker } from "../../ai/advisor/shopRanker";
import type { DownloadProgress } from "../../ai/policy";
import type { ShopAdviceCandidate } from "../../ai/advisor/types";
import {
  type ContextAdviceCandidate,
  useSuggestion,
  type SuggestionDeps,
} from "../../ai/advisor/useSuggestion";
import { setHumanPlayRecordingSuppressed } from "../../ai/humanPlayWiring";
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
}

export default function ShopSuggestion(
  props: ShopSuggestionProps,
): React.JSX.Element | null {
  const ante = useGame((s) => s.ante);
  const jokers = useGame((s) => s.jokers);
  const consumables = useGame((s) => s.consumables);
  const shopRanker = sharedShopRanker();
  const [modelProgress, setModelProgress] = useState<DownloadProgress | null>(
    null,
  );
  const [dismissed, setDismissed] = useState(false);
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
          round: (ante - 1) * 3,
          candidates: candidates as ReadonlyArray<ShopAdviceCandidate>,
        })
        .then((ranked) => ranked[0] ?? null);
    },
    [shopRanker, props.money, ante],
  );
  const { state, coach, askAi, reset } = useSuggestion<ShopSuggestionAction>(
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
    preRank,
  );

  const shopSignature =
    `${props.money}|${ante}|${props.rerollCost}|${props.disabled}|` +
    props.offers.map((o) => `${o.kind}:${o.price}:${o.sold}`).join(",") +
    "|" +
    props.vouchers.map((v) => v.id).join(",");

  useEffect(() => {
    if (dismissed || props.disabled) return;
    void coach();
  }, [coach, shopSignature, dismissed, props.disabled]);

  function apply(): void {
    if (state.phase === "idle") return;
    const action =
      state.onnxIndex !== null ? state.actions[state.onnxIndex] : undefined;
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

  if (dismissed) return null;

  return (
    <div className="shop-suggestion">
      <CoachAdvice
        state={state}
        modelProgress={modelProgress}
        onApply={apply}
        onAskAi={() => void askAi()}
        onDismiss={() => {
          reset();
          setDismissed(true);
        }}
      />
    </div>
  );
}
