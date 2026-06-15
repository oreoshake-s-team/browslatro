import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  buildPackAdvicePlan,
  type PackSuggestionAction,
} from "../../ai/advisor/packAdvicePlan";
import { sharedShopRanker } from "../../ai/advisor/shopRanker";
import type { DownloadProgress } from "../../ai/policy";
import type { PackAdviceCandidate } from "../../ai/advisor/types";
import {
  type ContextAdviceCandidate,
  useSuggestion,
  type SuggestionDeps,
} from "../../ai/advisor/useSuggestion";
import { setHumanPlayRecordingSuppressed } from "../../ai/humanPlayWiring";
import { MAX_CONSUMABLE_SLOTS } from "../../items/consumables";
import { deckJokerSlotsDelta } from "../../items/decks";
import { MAX_JOKERS } from "../../items/jokers";
import type { PackOffer } from "../../items/packs";
import {
  extraConsumableSlots,
  extraJokerSlots,
} from "../../items/vouchers";
import { useGame } from "../../store/game";
import CoachAdvice from "../advisor/CoachAdvice";
import "./PackSuggestion.css";

export interface PackSuggestionProps {
  readonly pack: PackOffer;
  readonly picksRemaining: number;
  readonly pickedIndices: ReadonlySet<number>;
  readonly jokerSlotsFull: boolean;
  readonly consumableSlotsFull: boolean;
  readonly onPick: (optionIdx: number) => void;
  readonly onClose: () => void;
  readonly suggestionDeps?: SuggestionDeps;
  readonly triggerContainer?: HTMLElement | null;
}

export default function PackSuggestion(
  props: PackSuggestionProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const money = useGame((s) => s.money);
  const ante = useGame((s) => s.ante);
  const jokers = useGame((s) => s.jokers);
  const consumables = useGame((s) => s.consumables);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const selectedDeck = useGame((s) => s.selectedDeck);
  const previewHandSize = useGame((s) => s.packPreviewHand.length);
  const previewSelectedCount = useGame((s) => s.packPreviewSelectedIds.size);
  const shopRanker = sharedShopRanker();
  const [modelProgress, setModelProgress] = useState<DownloadProgress | null>(
    null,
  );
  const [revealed, setRevealed] = useState(false);
  const preRank = useCallback(
    (candidates: ReadonlyArray<ContextAdviceCandidate>) => {
      setModelProgress({ loaded: 0, total: null });
      void shopRanker
        .load((progress) => setModelProgress(progress))
        .finally(() => setModelProgress(null));
      return shopRanker
        .rankPack({
          money,
          ante,
          round: (ante - 1) * 3,
          picksRemaining: props.picksRemaining,
          candidates: candidates as ReadonlyArray<PackAdviceCandidate>,
        })
        .then((ranked) => ranked[0] ?? null);
    },
    [shopRanker, money, ante, props.picksRemaining],
  );
  const { state, coach, askAi, reset } = useSuggestion<PackSuggestionAction>(
    () =>
      buildPackAdvicePlan({
        pack: props.pack,
        picksRemaining: props.picksRemaining,
        pickedIndices: props.pickedIndices,
        jokerSlotsFull: props.jokerSlotsFull,
        consumableSlotsFull: props.consumableSlotsFull,
        previewHandSize,
        previewSelectedCount,
        money,
        ante,
        jokers,
        consumables,
        jokerCapacity: Math.max(
          0,
          MAX_JOKERS +
            extraJokerSlots(ownedVoucherIds) +
            deckJokerSlotsDelta(selectedDeck),
        ),
        consumableCapacity:
          MAX_CONSUMABLE_SLOTS + extraConsumableSlots(ownedVoucherIds),
      }),
    props.suggestionDeps,
    preRank,
  );

  function apply(): void {
    if (state.phase === "idle") return;
    const action =
      state.onnxIndex !== null ? state.actions[state.onnxIndex] : undefined;
    if (action === undefined) return;
    setHumanPlayRecordingSuppressed(true);
    try {
      if (action.kind === "pick") props.onPick(action.optionIdx);
      else props.onClose();
    } finally {
      setHumanPlayRecordingSuppressed(false);
    }
    reset();
  }

  const trigger = (
    <button
      type="button"
      className="btn btn--advisor pack-suggest-button"
      data-testid="coach-trigger"
      onClick={() => setRevealed(true)}
    >
      <span aria-hidden="true">⚡ </span>
      {t("advisor.coachTip")}
    </button>
  );

  return (
    <div className="pack-suggestion">
      {!revealed &&
        (props.triggerContainer
          ? createPortal(trigger, props.triggerContainer)
          : trigger)}
      {revealed && (
        <CoachAdvice
          state={state}
          modelProgress={modelProgress}
          onCoach={() => void coach()}
          onApply={apply}
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
