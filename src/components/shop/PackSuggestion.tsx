import { useTranslation } from "react-i18next";
import {
  buildPackAdvicePlan,
  type PackSuggestionAction,
} from "../../ai/advisor/packAdvicePlan";
import {
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
import SuggestionAdvice from "../advisor/SuggestionAdvice";
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
  const { state, suggest, reset } = useSuggestion<PackSuggestionAction>(
    () =>
      buildPackAdvicePlan({
        pack: props.pack,
        picksRemaining: props.picksRemaining,
        pickedIndices: props.pickedIndices,
        jokerSlotsFull: props.jokerSlotsFull,
        consumableSlotsFull: props.consumableSlotsFull,
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
  );

  function apply(): void {
    if (state.phase !== "ready") return;
    const action = state.actions[state.advice.recommendationIndex];
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

  return (
    <div className="pack-suggestion">
      <button
        type="button"
        className="btn pack-suggest-button"
        data-testid="pack-suggest"
        disabled={state.phase === "loading"}
        aria-label={t("advisor.suggestPackButton")}
        onClick={() => void suggest()}
      >
        <span aria-hidden="true">💡 </span>
        {t("advisor.suggestPackButton")}
      </button>
      <SuggestionAdvice
        state={state}
        onApply={apply}
        onDismiss={reset}
        onRetry={() => void suggest()}
      />
    </div>
  );
}
