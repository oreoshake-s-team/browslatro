import { useGame } from "../store/game";
import { play } from "../components/system/sounds";
import { applyPlanetUpgrade } from "../items/planets";
import {
  MAX_CONSUMABLE_SLOTS,
  addConsumable,
  hasFreeConsumableSlot,
} from "../items/consumables";
import {
  resolveHermitPayout,
  resolveTemperancePayout,
  rollWheelOfFortune,
} from "../items/tarots";
import {
  MAX_JOKERS,
  effectiveJokerCount,
  withEdition,
} from "../items/jokers";
import { spectralNeedsTarget } from "../items/spectrals";
import { extraConsumableSlots } from "../items/vouchers";

export interface UseOpenedPackPickerResult {
  readonly pickFromOpenedPack: (optionIdx: number) => void;
}

export function useOpenedPackPicker(): UseOpenedPackPickerResult {
  const openedPack = useGame((s) => s.openedPack);
  const triggerNope = useGame((s) => s.triggerNope);
  const packPicksRemaining = useGame((s) => s.packPicksRemaining);
  const packPreviewHand = useGame((s) => s.packPreviewHand);
  const packPreviewSelectedIds = useGame((s) => s.packPreviewSelectedIds);
  const consumables = useGame((s) => s.consumables);
  const setConsumables = useGame((s) => s.setConsumables);
  const setHandStats = useGame((s) => s.setHandStats);
  const jokers = useGame((s) => s.jokers);
  const setJokers = useGame((s) => s.setJokers);
  const setAddedCards = useGame((s) => s.setAddedCards);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const applyEnhancementToSelectedPreviewCards = useGame(
    (s) => s.applyEnhancementToSelectedPreviewCards,
  );
  const duplicateSelectedPreviewCards = useGame(
    (s) => s.duplicateSelectedPreviewCards,
  );
  const applySpectralEffect = useGame((s) => s.applySpectralEffect);
  const decrementPackPicks = useGame((s) => s.decrementPackPicks);

  const consumableCapacity =
    MAX_CONSUMABLE_SLOTS + extraConsumableSlots(ownedVoucherIds);

  function pickFromOpenedPack(optionIdx: number): void {
    if (!openedPack || packPicksRemaining <= 0) return;
    const option = openedPack.options[optionIdx];
    if (!option) return;
    if (option.kind === "planet") {
      play("pop");
      setHandStats((prev) => applyPlanetUpgrade(prev, option.planet));
    } else if (option.kind === "tarot") {
      const effect = option.tarot.effect;
      if (effect.kind === "apply-enhancement") {
        if (packPreviewHand.length === 0) {
          if (!hasFreeConsumableSlot(consumables, consumableCapacity)) return;
          play("pop");
          setConsumables((prev) =>
            addConsumable(prev, { kind: "tarot", card: option.tarot }, consumableCapacity),
          );
        } else {
          if (
            packPreviewSelectedIds.size === 0 ||
            packPreviewSelectedIds.size > effect.maxTargets
          ) {
            return;
          }
          play("pop");
          applyEnhancementToSelectedPreviewCards(effect.enhancement);
        }
      } else if (effect.kind === "money-multiply") {
        play("pop");
        useGame
          .getState()
          .earn(resolveHermitPayout(useGame.getState().money, effect.bonusCap));
      } else if (effect.kind === "joker-sell-value-payout") {
        play("pop");
        useGame.getState().earn(resolveTemperancePayout(jokers, effect.cap));
      } else if (effect.kind === "edition-roll") {
        play("pop");
        const result = rollWheelOfFortune(jokers, effect.chance);
        if (result.hit && result.targetIdx >= 0) {
          setJokers((prev) =>
            prev.map((j, i) => (i === result.targetIdx ? withEdition(j, result.edition) : j)),
          );
        } else {
          triggerNope();
        }
      }
    } else if (option.kind === "joker") {
      if (effectiveJokerCount(jokers) >= MAX_JOKERS) return;
      play("pop");
      setJokers((prev) => [...prev, option.joker]);
    } else if (option.kind === "spectral") {
      const effect = option.spectral.effect;
      if (effect.kind === "duplicate-selected") {
        if (
          packPreviewSelectedIds.size === 0 ||
          packPreviewSelectedIds.size > effect.maxTargets
        ) {
          return;
        }
        play("pop");
        duplicateSelectedPreviewCards(effect.copies);
      } else if (spectralNeedsTarget(effect)) {
        if (!hasFreeConsumableSlot(consumables, consumableCapacity)) return;
        play("pop");
        setConsumables((prev) =>
          addConsumable(prev, { kind: "spectral", card: option.spectral }, consumableCapacity),
        );
      } else {
        play("pop");
        applySpectralEffect(effect);
      }
    } else if (option.kind === "playing-card") {
      play("pop");
      setAddedCards((prev) => [...prev, option.card]);
    } else {
      return;
    }
    decrementPackPicks();
  }

  return { pickFromOpenedPack };
}
