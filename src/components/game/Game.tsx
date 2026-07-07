import { Suspense, lazy, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { tHandLabel } from "../../i18n/handLabels";
import "./Game.css";
import type { Card } from "../../cards/types";
import HandComponent from "../cards/Hand";
import DeckPile from "../cards/DeckPile";
import Jokers from "../jokers/Jokers";
import Consumables from "../consumables/Consumables";
import { foolCopyTargetText } from "../../i18n/foolCopyTarget";
import type { ShopProps } from "../shop/Shop";
import type { PackOpenModalProps } from "../shop/PackOpenModal";
import { packShowsHandArea } from "../../items/packs";
import ModifierPanel from "./ModifierPanel";
import AutopilotControls from "./AutopilotControls";
import type { HandOption } from "../../ai/getHandOptions";
import type { MoveExplanationState } from "../../ai/advisor/useMoveExplanation";
import type { DownloadProgress } from "../../ai/policy";
import LazyChunkSpinner from "../system/LazyChunkSpinner";
const Shop = lazy(() => import("../shop/Shop"));
const PackOpenModal = lazy(() => import("../shop/PackOpenModal"));
const NopeAnimation = lazy(() => import("./NopeAnimation"));
import { useGame } from "../../store/game";
import { consumableCapacityFor, jokerCapacityFor } from "../../items/capacities";
import { useDragController } from "../../hooks/useDragController";
import { useConsumableActions } from "../../hooks/useConsumableActions";
import { useCeruleanForcedCard } from "../../hooks/useCeruleanForcedCard";
import { play } from "../system/sounds";
import { announce } from "../system/LiveAnnouncer";
import { usePreferences } from "../system/preferences";
import {
  bossForcesCardSelection,
  bossHidesJokers,
  debuffedHandIds,
} from "../../items/bosses";
import { fullDeckPile } from "../../cards/deckBuild";

interface GameProps {
  onSubmitHand: () => void;
  onDiscard: () => void;
  canDiscard: boolean;
  autopilotEnabled?: boolean;
  onToggleAutopilot?: () => void;
  autopilotProposal?: HandOption | null;
  autopilotModelProgress?: DownloadProgress | null;
  autopilotProposalUnavailable?: boolean;
  autopilotAdvisorUnavailable?: boolean;
  autopilotExplanation?: MoveExplanationState;
  autopilotFeedbackCandidates?: ReadonlyArray<HandOption> | null;
  autopilotFeedbackRecorded?: boolean;
  onApproveAutopilot?: () => void;
  onAskAiAutopilot?: () => void;
  onRetryAutopilot?: () => void;
  onAutopilotFeedback?: (correctedIndex: number | null) => void;
  onAutopilotAgree?: () => void;
  onAutopilotPreviewFeedback?: (option: HandOption) => void;
  isScoring?: boolean;
  scoringId?: number | null;
  goldScoringId?: number | null;
  steelScoringId?: number | null;
  shop?: ShopProps;
  packOpen?: PackOpenModalProps;
  onCardDiscardEnd: (card: Card) => void;
}

export default function Game({
  onSubmitHand,
  onDiscard,
  canDiscard,
  autopilotEnabled = false,
  onToggleAutopilot,
  autopilotProposal = null,
  autopilotModelProgress = null,
  autopilotProposalUnavailable = false,
  autopilotAdvisorUnavailable = false,
  autopilotExplanation = { phase: "idle" },
  autopilotFeedbackCandidates = null,
  autopilotFeedbackRecorded = false,
  onApproveAutopilot,
  onAskAiAutopilot,
  onRetryAutopilot,
  onAutopilotFeedback,
  onAutopilotAgree,
  onAutopilotPreviewFeedback,
  isScoring = false,
  scoringId = null,
  goldScoringId = null,
  steelScoringId = null,
  shop,
  packOpen,
  onCardDiscardEnd,
}: GameProps) {
  const { t, i18n } = useTranslation();
  const hand = useGame((s) => s.dealt.hand);
  const remaining = useGame((s) => s.dealt.remaining);
  const baseDeckCards = useGame((s) => s.baseDeckCards);
  const destroyedCardIds = useGame((s) => s.destroyedCardIds);
  const addedCards = useGame((s) => s.addedCards);
  const cardEnhancementsById = useGame((s) => s.cardEnhancementsById);
  const cardSealsById = useGame((s) => s.cardSealsById);
  const selectedIds = useGame((s) => s.selectedIds);
  const discardingIds = useGame((s) => s.discardingIds);
  const newlyDrawnIds = useGame((s) => s.newlyDrawnIds);
  const jokers = useGame((s) => s.jokers);
  const jokerPulseCounters = useGame((s) => s.jokerPulseCounters);
  const consumables = useGame((s) => s.consumables);
  const lastUsedConsumable = useGame((s) => s.lastUsedConsumable);
  const scoringPulseTick = useGame((s) => s.scoringIndex);
  const luckyMultProcIds = useGame((s) => s.luckyMultProcIds);
  const luckyMoneyProcIds = useGame((s) => s.luckyMoneyProcIds);
  const handPlaySignal = useGame((s) => s.handPlaySignal);
  const toggleCard = useGame((s) => s.toggleCard);
  const forcedCardId = useGame((s) => s.forcedCardId);
  const setHandDisplayOrder = useGame((s) => s.setHandDisplayOrder);
  const reorderJokers = useGame((s) => s.reorderJokers);
  const blind = useGame((s) => s.blind);
  const currentBoss = useGame((s) => s.currentBoss);
  const selectedHand = useGame((s) => s.selectedHand);
  const chips = useGame((s) => s.chips);
  const multiplier = useGame((s) => s.multiplier);
  const devChipsBonus = useGame((s) => s.devChipsBonus);
  const devMultBonus = useGame((s) => s.devMultBonus);
  const devMultFactor = useGame((s) => s.devMultFactor);
  const adminMode = usePreferences((s) => s.adminMode);
  const playedCardKeysThisAnte = useGame((s) => s.playedCardKeysThisAnte);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const selectedDeck = useGame((s) => s.selectedDeck);
  const nopeTriggerKey = useGame((s) => s.nopeTriggerKey);
  const sellConsumableAction = useGame((s) => s.sellConsumable);
  const sellJokerAction = useGame((s) => s.sellJoker);

  const { useConsumable } = useConsumableActions();

  function sellConsumable(consumableIdx: number): void {
    play("pop");
    sellConsumableAction(consumableIdx);
  }
  function sellJoker(jokerIdx: number): void {
    play("pop");
    sellJokerAction(jokerIdx);
  }

  const dragController = useDragController({
    useConsumable,
    sellConsumable,
    sellJoker,
  });

  const debuffedIds = debuffedHandIds(
    hand,
    currentBoss,
    blind === 3,
    playedCardKeysThisAnte,
  );
  useCeruleanForcedCard();
  const forcesCard = blind === 3 && bossForcesCardSelection(currentBoss);
  const handleToggleCard = (card: Card) => {
    if (forcesCard && forcedCardId === card.id) {
      announce(t("a11y.cardLockedAttempt"));
      return;
    }
    toggleCard(card);
  };
  const consumableCapacity =
    consumableCapacityFor(ownedVoucherIds);
  const foolCopyTarget = foolCopyTargetText(t, i18n.language, lastUsedConsumable);
  const jokerCapacity = jokerCapacityFor(ownedVoucherIds, selectedDeck);
  const overlayDeckRemaining = useMemo(
    () =>
      fullDeckPile(
        baseDeckCards,
        destroyedCardIds,
        addedCards,
        cardEnhancementsById,
        cardSealsById,
      ).remaining,
    [
      baseDeckCards,
      destroyedCardIds,
      addedCards,
      cardEnhancementsById,
      cardSealsById,
    ],
  );
  const inHandRemaining = useMemo(
    () => remaining.filter((c) => !destroyedCardIds.has(c.id)),
    [remaining, destroyedCardIds],
  );

  const dragging = dragController.draggingConsumableIndex !== null;
  const draggingJoker = dragController.draggingJokerIndex !== null;
  const previewActive = (packOpen?.previewHand?.length ?? 0) > 0;
  const handVisible = !shop && !packOpen;
  const holdsHandConsumable = consumables.some(
    (c) => c.kind === "tarot" || c.kind === "spectral",
  );
  const packShowsHand = packOpen ? packShowsHandArea(packOpen.pack.pool) : false;
  const showPackHand =
    !!packOpen && packShowsHand && !previewActive && holdsHandConsumable;
  const consumableSelectedCount = previewActive
    ? packOpen?.previewSelectedIds?.size ?? 0
    : selectedIds.size;

  const packOffersJoker = packOpen
    ? packOpen.pack.options.some((option) => option.kind === "joker")
    : false;
  const jokersNode = (
    <Jokers
      jokers={jokers}
      capacity={jokerCapacity}
      faceDown={blind === 3 && bossHidesJokers(currentBoss)}
      pulseCounters={jokerPulseCounters}
      onReorder={reorderJokers}
      onSell={sellJoker}
      sellAlwaysVisible={packOffersJoker}
      onDragStart={dragController.onJokerDragStart}
      onDragEnd={dragController.onJokerDragEnd}
      consumableDropEnabled={
        dragging && dragController.canDropDraggedConsumableOnJokers
      }
      onConsumableDrop={dragController.onConsumableDropOnJokers}
    />
  );
  const consumablesNode = (
    <Consumables
      consumables={consumables}
      foolCopyTarget={foolCopyTarget}
      selectedCount={consumableSelectedCount}
      previewMode={previewActive}
      capacity={consumableCapacity}
      onUse={useConsumable}
      onSell={sellConsumable}
      onDragStart={dragController.onConsumableDragStart}
      onDragEnd={dragController.onConsumableDragEnd}
    />
  );
  const handNode = (
    <HandComponent
      hand={hand}
      remaining={inHandRemaining}
      selectedIds={selectedIds}
      forcedCardId={forcesCard ? forcedCardId : null}
      discardingIds={discardingIds}
      newlyDrawnIds={newlyDrawnIds}
      debuffedIds={debuffedIds}
      scoringId={scoringId}
      scoringPulseTick={scoringPulseTick}
      goldScoringId={goldScoringId}
      steelScoringId={steelScoringId}
      luckyMultProcIds={luckyMultProcIds}
      luckyMoneyProcIds={luckyMoneyProcIds}
      handPlaySignal={handPlaySignal}
      onToggleCard={handleToggleCard}
      onCardDiscardEnd={onCardDiscardEnd}
      onDisplayOrderChange={setHandDisplayOrder}
      consumableDropEnabled={dragging}
      onConsumableSellDrop={dragController.onConsumableDropOnDeck}
      jokerDropEnabled={draggingJoker}
      onJokerSellDrop={dragController.onJokerDropOnDeck}
    />
  );
  const overlayDeckNode = (
    <div className="game-overlay-deck">
      <DeckPile
        remaining={overlayDeckRemaining}
        consumableDropEnabled={dragging}
        onConsumableDrop={dragController.onConsumableDropOnDeck}
        jokerDropEnabled={draggingJoker}
        onJokerDrop={dragController.onJokerDropOnDeck}
      />
    </div>
  );

  return (
    <main className="game" aria-label={t("a11y.game")} aria-busy={isScoring}>
      <div className="game-top-row">
        {!packOpen && jokersNode}
        {!packOpen && consumablesNode}
        {shop && !packOpen && overlayDeckNode}
      </div>
      {packOpen && (
        <Suspense fallback={<LazyChunkSpinner variant="overlay" />}>
          <PackOpenModal
            {...packOpen}
            foolCopyTarget={foolCopyTarget}
            playArea={
              <>
                <div className="game-top-row">
                  {jokersNode}
                  {consumablesNode}
                  {packShowsHand && !showPackHand && overlayDeckNode}
                </div>
                {showPackHand && handNode}
              </>
            }
          />
        </Suspense>
      )}
      {shop && (
        <Suspense fallback={<LazyChunkSpinner />}>
          <Shop {...shop} disabled={!!packOpen} foolCopyTarget={foolCopyTarget} />
        </Suspense>
      )}
      {handVisible && handNode}
      {!shop && !packOpen && (
        <div className="submit-hand">
          <div className="play-actions">
            <button
              className="btn btn--primary submit-hand-button"
              onClick={onSubmitHand}
              disabled={isScoring || selectedIds.size === 0}
              aria-label={
                selectedHand
                  ? t("a11y.submitHandWith", {
                      hand: tHandLabel(t, selectedHand.label),
                      chips: chips + devChipsBonus,
                      mult: (multiplier + devMultBonus) * devMultFactor,
                    })
                  : t("a11y.submitHand")
              }
            >
              <span aria-hidden="true">🃏 </span>
              {t("game.submitHand")}
              {selectedHand && (
                <span
                  className="submit-hand-button-detected"
                  data-testid="submit-hand-detected"
                >
                  <span className="submit-hand-button-detected-label">
                    {tHandLabel(t, selectedHand.label)}
                  </span>
                  <span className="submit-hand-button-detected-score">
                    <span className="submit-hand-button-chips">
                      {chips + devChipsBonus}
                    </span>
                    <span aria-hidden="true"> × </span>
                    <span className="submit-hand-button-mult">
                      {(multiplier + devMultBonus) * devMultFactor}
                    </span>
                  </span>
                </span>
              )}
            </button>
            <button
              className="btn btn--secondary discard-button"
              onClick={onDiscard}
              disabled={!canDiscard}
            >
              <span aria-hidden="true">🗑️ </span>Discard
            </button>
            {onToggleAutopilot && (
              <button
                className="btn btn--advisor autopilot-toggle-button"
                onClick={onToggleAutopilot}
                aria-pressed={autopilotEnabled}
              >
                <span aria-hidden="true">🤖 </span>
                {t("advisor.autopilot")}
              </button>
            )}
          </div>
          {(autopilotProposal ||
            autopilotModelProgress ||
            autopilotProposalUnavailable ||
            autopilotAdvisorUnavailable ||
            autopilotFeedbackRecorded) &&
            onApproveAutopilot && (
              <AutopilotControls
                proposal={autopilotProposal}
                modelProgress={autopilotModelProgress}
                proposalUnavailable={autopilotProposalUnavailable}
                advisorUnavailable={autopilotAdvisorUnavailable}
                explanation={autopilotExplanation}
                feedbackCandidates={autopilotFeedbackCandidates}
                feedbackRecorded={autopilotFeedbackRecorded}
                onApprove={onApproveAutopilot}
                onAskAi={onAskAiAutopilot ?? (() => {})}
                onRetry={onRetryAutopilot ?? (() => {})}
                onFeedback={onAutopilotFeedback}
                onAgree={onAutopilotAgree}
                onPreviewFeedback={onAutopilotPreviewFeedback}
              />
            )}
        </div>
      )}
      {adminMode && <ModifierPanel />}
      <Suspense fallback={<LazyChunkSpinner />}>
        <NopeAnimation triggerKey={nopeTriggerKey} />
      </Suspense>
    </main>
  );
}
