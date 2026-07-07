import { useGame } from "../store/game";
import { consumableCapacityFor, jokerCapacityFor } from "../items/capacities";
import { captureRunEvent } from "../ai/humanPlayWiring";
import { packOptionSnapshot } from "../ai/runEvents";
import { play } from "../components/system/sounds";
import {
  applyPlanetUpgrade,
  availablePlanets,
  createPlanetCatalog,
  type PlanetCard,
} from "../items/planets";
import {
  addConsumable,
  hasFreeConsumableSlot,
  type Consumable,
} from "../items/consumables";
import {
  createTarotCatalog,
  resolveHermitPayout,
  resolveTemperancePayout,
  rollWheelOfFortune,
  tarotRngConfig,
  type TarotCard,
} from "../items/tarots";
import {
  createRandomJoker,
  effectiveJokerCount,
  withEdition,
  applyConsumableUsedToJokerStates,
} from "../items/jokers";
import { spectralNeedsTarget } from "../items/spectrals";
import { availableJokerCatalog } from "../store/jokerCatalog";

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
  const applyDeathCopyToSelectedPreviewCards = useGame(
    (s) => s.applyDeathCopyToSelectedPreviewCards,
  );
  const applySuitToSelectedPreviewCards = useGame(
    (s) => s.applySuitToSelectedPreviewCards,
  );
  const destroySelectedPreviewCards = useGame(
    (s) => s.destroySelectedPreviewCards,
  );
  const rankUpSelectedPreviewCards = useGame(
    (s) => s.rankUpSelectedPreviewCards,
  );
  const lastUsedConsumable = useGame((s) => s.lastUsedConsumable);
  const setLastUsedConsumable = useGame((s) => s.setLastUsedConsumable);
  const applySpectralEffect = useGame((s) => s.applySpectralEffect);
  const decrementPackPicks = useGame((s) => s.decrementPackPicks);
  const refreshCelestialPricing = useGame((s) => s.refreshCelestialPricing);
  const setPickedPackOptionIndices = useGame(
    (s) => s.setPickedPackOptionIndices,
  );

  const consumableCapacity =
    consumableCapacityFor(ownedVoucherIds);

  function pickFromOpenedPack(optionIdx: number): void {
    if (!openedPack || packPicksRemaining <= 0) return;
    const option = openedPack.options[optionIdx];
    if (!option) return;
    function markUsed(kind: "tarot" | "planet"): void {
      setJokers((prev) => applyConsumableUsedToJokerStates(prev, kind));
      if (option.kind === "planet") {
        setLastUsedConsumable({ kind: "planet", card: option.planet });
      } else if (option.kind === "tarot" && option.tarot.id !== "the-fool") {
        setLastUsedConsumable({ kind: "tarot", card: option.tarot });
      }
    }
    if (option.kind === "planet") {
      play("pop");
      setHandStats((prev) => applyPlanetUpgrade(prev, option.planet));
      markUsed("planet");
      useGame
        .getState()
        .setPlanetsUsed((prev) => new Set(prev).add(option.planet.id));
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
          markUsed("tarot");
          applyEnhancementToSelectedPreviewCards(effect.enhancement);
        }
      } else if (effect.kind === "money-multiply") {
        play("pop");
        markUsed("tarot");
        useGame
          .getState()
          .earn(resolveHermitPayout(useGame.getState().money, effect.bonusCap));
      } else if (effect.kind === "joker-sell-value-payout") {
        play("pop");
        markUsed("tarot");
        useGame.getState().earn(resolveTemperancePayout(jokers, effect.cap));
      } else if (effect.kind === "edition-roll") {
        play("pop");
        markUsed("tarot");
        const result = rollWheelOfFortune(jokers, effect.chance);
        if (result.hit && result.targetIdx >= 0) {
          setJokers((prev) =>
            prev.map((j, i) => (i === result.targetIdx ? withEdition(j, result.edition) : j)),
          );
        } else {
          triggerNope();
        }
      } else if (effect.kind === "create-joker") {
        const capacity = jokerCapacityFor(
          ownedVoucherIds,
          useGame.getState().selectedDeck,
        );
        const created = createRandomJoker(
          jokers,
          availableJokerCatalog(useGame.getState()),
          capacity,
        );
        if (!created) return;
        play("pop");
        markUsed("tarot");
        setJokers((prev) => [...prev, created]);
        refreshCelestialPricing();
      } else if (effect.kind === "destroy-selected") {
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
          markUsed("tarot");
          destroySelectedPreviewCards();
        }
      } else if (effect.kind === "rank-up-selected") {
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
          markUsed("tarot");
          rankUpSelectedPreviewCards();
        }
      } else if (effect.kind === "death-copy") {
        if (packPreviewHand.length === 0) {
          if (!hasFreeConsumableSlot(consumables, consumableCapacity)) return;
          play("pop");
          setConsumables((prev) =>
            addConsumable(prev, { kind: "tarot", card: option.tarot }, consumableCapacity),
          );
        } else {
          if (packPreviewSelectedIds.size !== effect.requiredTargets) return;
          play("pop");
          markUsed("tarot");
          applyDeathCopyToSelectedPreviewCards();
        }
      } else if (effect.kind === "convert-suit") {
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
          markUsed("tarot");
          applySuitToSelectedPreviewCards(effect.suit);
        }
      } else if (effect.kind === "copy-last-consumable") {
        if (!lastUsedConsumable) return;
        if (lastUsedConsumable.kind === "tarot" && lastUsedConsumable.card.id === "the-fool") return;
        if (!hasFreeConsumableSlot(consumables, consumableCapacity)) return;
        play("pop");
        markUsed("tarot");
        setConsumables((prev) =>
          addConsumable(prev, lastUsedConsumable, consumableCapacity),
        );
      } else if (effect.kind === "create-consumables") {
        if (!hasFreeConsumableSlot(consumables, consumableCapacity)) return;
        markUsed("tarot");
        const rng = tarotRngConfig.rng;
        const tarotPool: ReadonlyArray<TarotCard> =
          effect.consumableKind === "tarot"
            ? createTarotCatalog().filter((t) => t.id !== option.tarot.id)
            : [];
        const planetPool: ReadonlyArray<PlanetCard> =
          effect.consumableKind === "planet"
            ? availablePlanets(
                createPlanetCatalog(),
                useGame.getState().handPlayCounts,
              )
            : [];
        const added: Consumable[] = [];
        for (let i = 0; i < effect.count; i += 1) {
          if (consumables.length + added.length >= consumableCapacity) break;
          if (effect.consumableKind === "tarot") {
            if (tarotPool.length === 0) break;
            const pick = tarotPool[Math.floor(rng() * tarotPool.length)];
            added.push({ kind: "tarot", card: pick });
          } else {
            if (planetPool.length === 0) break;
            const pick = planetPool[Math.floor(rng() * planetPool.length)];
            added.push({ kind: "planet", card: pick });
          }
        }
        if (added.length === 0) return;
        play("pop");
        setConsumables((prev) => [...prev, ...added]);
      } else {
        if (packPreviewHand.length > 0) return;
        if (!hasFreeConsumableSlot(consumables, consumableCapacity)) return;
        play("pop");
        setConsumables((prev) =>
          addConsumable(prev, { kind: "tarot", card: option.tarot }, consumableCapacity),
        );
      }
    } else if (option.kind === "joker") {
      if (
        option.joker.edition !== "negative" &&
        effectiveJokerCount(jokers) >=
          jokerCapacityFor(ownedVoucherIds, useGame.getState().selectedDeck)
      ) {
        return;
      }
      play("pop");
      setJokers((prev) => [...prev, option.joker]);
      refreshCelestialPricing();
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
    captureRunEvent(useGame.getState(), {
      kind: "pack-pick",
      pool: openedPack.pool,
      variant: openedPack.variant,
      options: openedPack.options.map(packOptionSnapshot),
      pickedIndex: optionIdx,
      picksRemaining: packPicksRemaining,
    });
    setPickedPackOptionIndices((prev) => {
      const next = new Set(prev);
      next.add(optionIdx);
      return next;
    });
    decrementPackPicks();
  }

  return { pickFromOpenedPack };
}
