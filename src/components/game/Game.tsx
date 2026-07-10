import { Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";
import "./Game.css";
import Jokers from "../jokers/Jokers";
import Consumables from "../consumables/Consumables";
import { foolCopyTargetText } from "../../i18n/foolCopyTarget";
import { packShowsHandArea } from "../../items/packs";
import { useShopController } from "../../hooks/useShopController";
import { usePackOpenController } from "../../hooks/usePackOpenController";
import ModifierPanel from "./ModifierPanel";
import PlayControls from "./PlayControls";
import HandSection from "./HandSection";
import GameOverlayDeck from "./GameOverlayDeck";
import { useGameSession } from "./gameSession";
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
import { usePreferences } from "../system/preferences";
import { bossHidesJokers } from "../../items/bosses";

export default function Game() {
  const { isScoring } = useGameSession();
  const shop = useShopController();
  const packOpen = usePackOpenController();
  const { t, i18n } = useTranslation();
  const selectedIds = useGame((s) => s.selectedIds);
  const jokers = useGame((s) => s.jokers);
  const jokerPulseCounters = useGame((s) => s.jokerPulseCounters);
  const consumables = useGame((s) => s.consumables);
  const lastUsedConsumable = useGame((s) => s.lastUsedConsumable);
  const reorderJokers = useGame((s) => s.reorderJokers);
  const blind = useGame((s) => s.blind);
  const currentBoss = useGame((s) => s.currentBoss);
  const adminMode = usePreferences((s) => s.adminMode);
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

  useCeruleanForcedCard();
  const consumableCapacity =
    consumableCapacityFor(ownedVoucherIds);
  const foolCopyTarget = foolCopyTargetText(t, i18n.language, lastUsedConsumable);
  const jokerCapacity = jokerCapacityFor(ownedVoucherIds, selectedDeck);

  const dragging = dragController.draggingConsumableIndex !== null;
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

  return (
    <main className="game" aria-label={t("a11y.game")} aria-busy={isScoring}>
      <div className="game-top-row">
        {!packOpen && jokersNode}
        {!packOpen && consumablesNode}
        {shop && !packOpen && <GameOverlayDeck />}
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
                  {packShowsHand && !showPackHand && <GameOverlayDeck />}
                </div>
                {showPackHand && <HandSection />}
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
      {handVisible && <HandSection />}
      {!shop && !packOpen && <PlayControls />}
      {adminMode && <ModifierPanel />}
      <Suspense fallback={<LazyChunkSpinner />}>
        <NopeAnimation triggerKey={nopeTriggerKey} />
      </Suspense>
    </main>
  );
}
