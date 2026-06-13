import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useGame } from "../store/game";
import { bossForcesCardSelection } from "../items/bosses";
import { announce } from "../components/system/LiveAnnouncer";
import { cardName } from "../i18n/strings";

/**
 * Cerulean Bell: keeps one random card in hand force-selected. A new card is
 * forced whenever the current one leaves the hand (every play and discard
 * consumes it, since the forced card is always part of the played selection),
 * and the forced card is re-added to the selection if anything clears it.
 */
export function useCeruleanForcedCard(): void {
  const { t } = useTranslation();
  const blind = useGame((s) => s.blind);
  const currentBoss = useGame((s) => s.currentBoss);
  const hand = useGame((s) => s.dealt.hand);
  const selectedIds = useGame((s) => s.selectedIds);
  const forcedCardId = useGame((s) => s.forcedCardId);
  const setForcedCardId = useGame((s) => s.setForcedCardId);
  const active = blind === 3 && bossForcesCardSelection(currentBoss);

  useEffect(() => {
    if (!active) {
      if (forcedCardId !== null) setForcedCardId(null);
      return;
    }
    if (hand.length === 0) return;
    const stillForced =
      forcedCardId !== null && hand.some((c) => c.id === forcedCardId);
    let targetId = forcedCardId;
    if (!stillForced) {
      const pick = hand[Math.floor(Math.random() * hand.length)];
      targetId = pick.id;
      setForcedCardId(pick.id);
      announce(t("a11y.cardForcedAnnounce", { name: cardName(t, pick) }));
    }
    if (targetId !== null && !selectedIds.has(targetId)) {
      const next = new Set(selectedIds);
      next.add(targetId);
      useGame.getState().selectCards(next);
    }
  }, [active, hand, selectedIds, forcedCardId, setForcedCardId, t]);
}
