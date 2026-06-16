import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  buildBlindAdvicePlan,
  type BlindSuggestionAction,
} from "../../ai/advisor/blindAdvicePlan";
import { rankBlind } from "../../ai/advisor/blindCoach";
import type { BlindAdviceCandidate } from "../../ai/advisor/types";
import {
  type ContextAdviceCandidate,
  useSuggestion,
  type SuggestionDeps,
} from "../../ai/advisor/useSuggestion";
import { setHumanPlayRecordingSuppressed } from "../../ai/humanPlayWiring";
import type { Blind } from "../../cards/types";
import type { BossBlind } from "../../items/bosses";
import type { Stake } from "../../items/stakes";
import type { AnteSkipOffers } from "../../items/tags";
import { useGame } from "../../store/game";
import CoachAdvice from "../advisor/CoachAdvice";
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
  const [revealed, setRevealed] = useState(false);
  const preRank = useCallback(
    (candidates: ReadonlyArray<ContextAdviceCandidate>) =>
      Promise.resolve(
        rankBlind({
          ante: props.ante,
          jokerCount: jokers.length,
          candidates: candidates as ReadonlyArray<BlindAdviceCandidate>,
        })[0] ?? null,
      ),
    [props.ante, jokers],
  );
  const { state, coach, askAi, reset } = useSuggestion<BlindSuggestionAction>(
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
    preRank,
  );

  function apply(): void {
    if (state.phase === "idle") return;
    const action =
      state.onnxIndex !== null ? state.actions[state.onnxIndex] : undefined;
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
      data-testid="coach-trigger"
      onClick={() => {
        setRevealed(true);
        void coach();
      }}
    >
      <span aria-hidden="true">⚡ </span>
      {t("advisor.coachTip")}
    </button>
  );

  return (
    <div className="blind-suggestion">
      {!revealed &&
        (props.triggerContainer
          ? createPortal(trigger, props.triggerContainer)
          : trigger)}
      {revealed && (
        <CoachAdvice
          state={state}
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
