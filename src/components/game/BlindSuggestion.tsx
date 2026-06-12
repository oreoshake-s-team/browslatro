import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  buildBlindAdvicePlan,
  type BlindSuggestionAction,
} from "../../ai/advisor/blindAdvicePlan";
import {
  useSuggestion,
  type SuggestionDeps,
} from "../../ai/advisor/useSuggestion";
import { setHumanPlayRecordingSuppressed } from "../../ai/humanPlayWiring";
import type { Blind } from "../../cards/types";
import type { BossBlind } from "../../items/bosses";
import type { Stake } from "../../items/stakes";
import type { AnteSkipOffers } from "../../items/tags";
import { useGame } from "../../store/game";
import SuggestionAdvice from "../advisor/SuggestionAdvice";
import "./BlindSuggestion.css";

export interface BlindSuggestionProps {
  readonly ante: number;
  readonly currentBlind: Blind;
  readonly boss: BossBlind;
  readonly stake?: Stake;
  readonly skipRewards?: Partial<AnteSkipOffers>;
  readonly onPlay: () => void;
  readonly onSkip: () => void;
  readonly triggerContainer?: HTMLElement | null;
  readonly suggestionDeps?: SuggestionDeps;
}

export default function BlindSuggestion(
  props: BlindSuggestionProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const money = useGame((s) => s.money);
  const jokers = useGame((s) => s.jokers);
  const consumables = useGame((s) => s.consumables);
  const { state, suggest, reset } = useSuggestion<BlindSuggestionAction>(
    () =>
      buildBlindAdvicePlan({
        ante: props.ante,
        currentBlind: props.currentBlind,
        boss: props.boss,
        stake: props.stake,
        skipRewards: props.skipRewards,
        money,
        jokers,
        consumables,
      }),
    props.suggestionDeps,
  );

  function apply(): void {
    if (state.phase !== "ready") return;
    const action = state.actions[state.advice.recommendationIndex];
    if (action === undefined) return;
    setHumanPlayRecordingSuppressed(true);
    try {
      if (action.kind === "play") props.onPlay();
      else props.onSkip();
    } finally {
      setHumanPlayRecordingSuppressed(false);
    }
    reset();
  }

  const trigger = (
    <button
      type="button"
      className="btn btn--advisor blind-suggest-button"
      data-testid="blind-suggest"
      disabled={state.phase === "loading"}
      aria-label={t("advisor.suggestBlindButton")}
      onClick={() => void suggest()}
    >
      <span aria-hidden="true">💡 </span>
      {t("advisor.suggestBlindButton")}
    </button>
  );

  return (
    <div className="blind-suggestion">
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
