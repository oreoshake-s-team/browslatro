import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  buildBlindAdvicePlan,
  type BlindSuggestionAction,
} from "../../ai/advisor/blindAdvicePlan";
import { sharedBlindRanker } from "../../ai/advisor/blindRanker";
import type { BlindRankInput } from "../../ai/advisor/blindEncoding";
import type { DownloadProgress } from "../../ai/policy";
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

function blindKind(blind: Blind): string {
  if (blind === 1) return "small";
  if (blind === 2) return "big";
  return "boss";
}

export default function BlindSuggestion(
  props: BlindSuggestionProps,
): React.JSX.Element {
  const { t } = useTranslation();
  const money = useGame((s) => s.money);
  const jokers = useGame((s) => s.jokers);
  const consumables = useGame((s) => s.consumables);
  const blindRanker = sharedBlindRanker();
  const [modelProgress, setModelProgress] = useState<DownloadProgress | null>(
    null,
  );
  const [revealed, setRevealed] = useState(false);
  const preRank = useCallback(
    (candidates: ReadonlyArray<ContextAdviceCandidate>) => {
      setModelProgress({ loaded: 0, total: null });
      void blindRanker
        .load((progress) => setModelProgress(progress))
        .finally(() => setModelProgress(null));
      const play = candidates.find((c) => c.action === "play");
      const input: BlindRankInput = {
        kind: blindKind(props.currentBlind),
        ante: props.ante,
        scoreTarget: play?.action === "play" ? play.scoreTarget : 0,
        payout: play?.action === "play" ? play.payout : 0,
        money,
        jokerCount: jokers.length,
        consumableCount: consumables.length,
        candidates: candidates as ReadonlyArray<BlindAdviceCandidate>,
      };
      return blindRanker.rankBlind(input).then((ranked) => ranked[0] ?? null);
    },
    [blindRanker, props.currentBlind, props.ante, money, jokers, consumables],
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
          modelProgress={modelProgress}
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
