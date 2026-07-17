import { Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";
import { foolCopyTargetText } from "../../i18n/foolCopyTarget";
import { packShowsHandArea } from "../../items/packs";
import { useShopController } from "../../hooks/useShopController";
import { usePackOpenController } from "../../hooks/usePackOpenController";
import ModifierPanel from "./ModifierPanel";
import PlayControls from "./PlayControls";
import HandSection from "./HandSection";
import GameOverlayDeck from "./GameOverlayDeck";
import JokersSection from "./JokersSection";
import ConsumablesSection from "./ConsumablesSection";
import { useGameSession } from "./gameSession";
import LazyChunkSpinner from "../system/LazyChunkSpinner";
const Shop = lazy(() => import("../shop/Shop"));
const PackOpenModal = lazy(() => import("../shop/PackOpenModal"));
const NopeAnimation = lazy(() => import("./NopeAnimation"));
import { useGame } from "../../store/game";
import { useCeruleanForcedCard } from "../../hooks/useCeruleanForcedCard";
import { usePreferences } from "../system/preferences";

export default function Game() {
  const { isScoring } = useGameSession();
  const shop = useShopController();
  const packOpen = usePackOpenController();
  const { t, i18n } = useTranslation();
  const consumables = useGame((s) => s.consumables);
  const lastUsedConsumable = useGame((s) => s.lastUsedConsumable);
  const adminMode = usePreferences((s) => s.adminMode);
  const nopeTriggerKey = useGame((s) => s.nopeTriggerKey);

  useCeruleanForcedCard();
  const foolCopyTarget = foolCopyTargetText(
    t,
    i18n.language,
    lastUsedConsumable,
  );

  const previewActive = (packOpen?.previewHand?.length ?? 0) > 0;
  const handVisible = !shop && !packOpen;
  const holdsHandConsumable = consumables.some(
    (c) => c.kind === "tarot" || c.kind === "spectral",
  );
  const packShowsHand = packOpen
    ? packShowsHandArea(packOpen.pack.pool)
    : false;
  const showPackHand =
    !!packOpen && packShowsHand && !previewActive && holdsHandConsumable;

  return (
    <main
      className="flex min-h-0 flex-1 flex-col items-start gap-5 overflow-y-auto p-5 landscape-narrow:gap-2.5"
      aria-label={t("a11y.game")}
      aria-busy={isScoring}
    >
      <div className="flex w-full max-w-225 flex-nowrap items-start gap-5">
        {!packOpen && <JokersSection />}
        {!packOpen && <ConsumablesSection />}
        {shop && !packOpen && <GameOverlayDeck />}
      </div>
      {packOpen && (
        <Suspense fallback={<LazyChunkSpinner variant="overlay" />}>
          <PackOpenModal
            {...packOpen}
            foolCopyTarget={foolCopyTarget}
            playArea={
              <>
                <div className="flex w-full max-w-225 flex-nowrap items-start gap-5">
                  <JokersSection />
                  <ConsumablesSection />
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
          <Shop
            {...shop}
            disabled={!!packOpen}
            foolCopyTarget={foolCopyTarget}
          />
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
