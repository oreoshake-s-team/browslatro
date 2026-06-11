import { useGame } from "../store/game";
import { captureRunEvent } from "../ai/humanPlayWiring";
import { toModelState } from "../ai/modelState";
import { toModelStateInput } from "../ai/advisor/snapshot";
import { play } from "../components/system/sounds";
import {
  applyPlanetUpgrade,
  availablePlanets,
  createPlanetCatalog,
  type PlanetCard,
} from "../items/planets";
import { addConsumable, removeConsumableAt } from "../items/consumables";
import { applyAuraToSelectedInHand, duplicateSelectedInHand } from "../items/spectrals";
import {
  createTarotCatalog,
  nextRankUp,
  resolveHermitPayout,
  resolveTemperancePayout,
  rollWheelOfFortune,
  tarotRngConfig,
  type TarotCard,
} from "../items/tarots";
import {
  createRandomJoker,
  MAX_JOKERS,
  withEdition,
  applyCardsDestroyedToJokerStates,
  applyConsumableUsedToJokerStates,
} from "../items/jokers";
import { extraConsumableSlots, extraJokerSlots } from "../items/vouchers";
import { MAX_CONSUMABLE_SLOTS, type Consumable } from "../items/consumables";
import { availableJokerCatalog } from "../store/jokerCatalog";
import { nextCardId } from "../cards/deck";
import type { Card } from "../cards/types";

export interface UseConsumableActionsResult {
  readonly useConsumable: (consumableIdx: number) => void;
}

export function useConsumableActions(): UseConsumableActionsResult {
  const consumables = useGame((s) => s.consumables);
  const triggerNope = useGame((s) => s.triggerNope);
  const setConsumables = useGame((s) => s.setConsumables);
  const openedPack = useGame((s) => s.openedPack);
  const packPreviewHand = useGame((s) => s.packPreviewHand);
  const packPreviewSelectedIds = useGame((s) => s.packPreviewSelectedIds);
  const setHandStats = useGame((s) => s.setHandStats);
  const selectedIds = useGame((s) => s.selectedIds);
  const setSelectedIds = useGame((s) => s.setSelectedIds);
  const setSelectedHand = useGame((s) => s.setSelectedHand);
  const setChips = useGame((s) => s.setChips);
  const setMultiplier = useGame((s) => s.setMultiplier);
  const setDealt = useGame((s) => s.setDealt);
  const jokers = useGame((s) => s.jokers);
  const setJokers = useGame((s) => s.setJokers);
  const applyEnhancementToSelectedPreviewCards = useGame(
    (s) => s.applyEnhancementToSelectedPreviewCards,
  );
  const applySealToSelectedPreviewCards = useGame(
    (s) => s.applySealToSelectedPreviewCards,
  );
  const applySuitToSelectedPreviewCards = useGame(
    (s) => s.applySuitToSelectedPreviewCards,
  );
  const applyDeathCopyToSelectedPreviewCards = useGame(
    (s) => s.applyDeathCopyToSelectedPreviewCards,
  );
  const destroySelectedPreviewCards = useGame(
    (s) => s.destroySelectedPreviewCards,
  );
  const rankUpSelectedPreviewCards = useGame(
    (s) => s.rankUpSelectedPreviewCards,
  );
  const applyAuraSelectedPreviewCards = useGame(
    (s) => s.applyAuraSelectedPreviewCards,
  );
  const duplicateSelectedPreviewCards = useGame(
    (s) => s.duplicateSelectedPreviewCards,
  );
  const applySpectralEffect = useGame((s) => s.applySpectralEffect);
  const setDestroyedCardIds = useGame((s) => s.setDestroyedCardIds);
  const setAddedCards = useGame((s) => s.setAddedCards);
  const setCardSealsById = useGame((s) => s.setCardSealsById);
  const setCardEnhancementsById = useGame((s) => s.setCardEnhancementsById);
  const setCardEditionsById = useGame((s) => s.setCardEditionsById);
  const setLastUsedConsumable = useGame((s) => s.setLastUsedConsumable);
  const handDisplayOrder = useGame((s) => s.handDisplayOrder);

  function useConsumable(consumableIdx: number): void {
    const entry = consumables[consumableIdx];
    if (!entry) return;
    const previewActive = openedPack !== null && packPreviewHand.length > 0;
    const preUse = useGame.getState();
    function consume(): void {
      const idx = consumableIdx;
      captureRunEvent(preUse, {
        kind: "consumable-use",
        consumable: {
          id: entry.card.id,
          name: entry.card.name,
          consumableKind: entry.kind,
        },
        targetCardIds: [...preUse.selectedIds],
        state: toModelState(toModelStateInput(preUse)),
      });
      setConsumables((prev) => removeConsumableAt(prev, idx));
      useGame
        .getState()
        .setJokers((prev) => applyConsumableUsedToJokerStates(prev, entry.kind));
      if (entry.kind === "planet") {
        useGame
          .getState()
          .setPlanetsUsed((prev) => new Set(prev).add(entry.card.id));
      }
      if (entry.kind === "planet") {
        setLastUsedConsumable(entry);
        return;
      }
      if (entry.kind === "tarot" && entry.card.id !== "the-fool") {
        setLastUsedConsumable(entry);
      }
    }
    if (entry.kind === "planet") {
      play("pop");
      setHandStats((prev) => applyPlanetUpgrade(prev, entry.card));
      if (selectedIds.size === 0) {
        const targetHand = entry.card.hands[0];
        const upgraded = applyPlanetUpgrade(
          useGame.getState().handStats,
          entry.card,
        );
        const entry2 = upgraded[targetHand];
        setSelectedHand({
          label: targetHand,
          chips: entry2.chips,
          multiplier: entry2.multiplier,
        });
        setChips(entry2.chips);
        setMultiplier(entry2.multiplier);
      }
      consume();
      return;
    }
    if (entry.kind === "spectral") {
      const spectralEffect = entry.card.effect;
      if (spectralEffect.kind === "apply-seal") {
        if (previewActive) {
          if (
            packPreviewSelectedIds.size === 0 ||
            packPreviewSelectedIds.size > spectralEffect.maxTargets
          ) {
            return;
          }
          play("pop");
          applySealToSelectedPreviewCards(spectralEffect.seal);
          consume();
          return;
        }
        if (selectedIds.size !== spectralEffect.maxTargets) return;
        play("pop");
        setDealt((prev) => ({
          hand: prev.hand.map((c) =>
            selectedIds.has(c.id) ? { ...c, seal: spectralEffect.seal } : c,
          ),
          remaining: prev.remaining,
        }));
        setCardSealsById((prev) => {
          const next = new Map(prev);
          for (const id of selectedIds) next.set(id, spectralEffect.seal);
          return next;
        });
        setSelectedIds(new Set());
        setSelectedHand(null);
        setChips(0);
        setMultiplier(0);
        consume();
        return;
      }
      if (spectralEffect.kind === "duplicate-selected") {
        if (previewActive) {
          if (packPreviewSelectedIds.size !== spectralEffect.maxTargets) return;
          play("pop");
          duplicateSelectedPreviewCards(spectralEffect.copies);
          consume();
          return;
        }
        if (selectedIds.size !== spectralEffect.maxTargets) return;
        play("pop");
        const duplicated = duplicateSelectedInHand(
          useGame.getState().dealt.hand,
          selectedIds,
          spectralEffect.copies,
        );
        setDealt((prev) => ({
          hand: duplicated.hand,
          remaining: prev.remaining,
        }));
        setAddedCards((prev) => [...prev, ...duplicated.additions]);
        setSelectedIds(new Set());
        setSelectedHand(null);
        setChips(0);
        setMultiplier(0);
        consume();
        return;
      }
      if (spectralEffect.kind === "aura") {
        if (previewActive) {
          if (packPreviewSelectedIds.size !== spectralEffect.maxTargets) return;
          play("pop");
          applyAuraSelectedPreviewCards();
          consume();
          return;
        }
        if (selectedIds.size !== spectralEffect.maxTargets) return;
        play("pop");
        const aura = applyAuraToSelectedInHand(
          useGame.getState().dealt.hand,
          selectedIds,
          Math.random,
        );
        setDealt((prev) => ({
          hand: aura.hand,
          remaining: prev.remaining,
        }));
        // Record the edition in the run-level overlay so it survives
        // future deals.
        if (aura.targetId !== null && aura.edition !== null) {
          const { targetId, edition } = aura;
          setCardEditionsById((prev) => new Map(prev).set(targetId, edition));
        }
        setSelectedIds(new Set());
        setSelectedHand(null);
        setChips(0);
        setMultiplier(0);
        consume();
        return;
      }
      play("pop");
      applySpectralEffect(spectralEffect);
      consume();
      return;
    }
    const effect = entry.card.effect;
    if (effect.kind === "money-multiply") {
      play("pop");
      useGame
        .getState()
        .earn(resolveHermitPayout(useGame.getState().money, effect.bonusCap));
      consume();
      return;
    }
    if (effect.kind === "joker-sell-value-payout") {
      play("pop");
      useGame.getState().earn(resolveTemperancePayout(jokers, effect.cap));
      consume();
      return;
    }
    if (effect.kind === "edition-roll") {
      play("pop");
      const result = rollWheelOfFortune(jokers, effect.chance);
      if (result.hit && result.targetIdx >= 0) {
        setJokers((prev) =>
          prev.map((j, i) => (i === result.targetIdx ? withEdition(j, result.edition) : j)),
        );
      } else {
        triggerNope();
      }
      consume();
      return;
    }
    if (effect.kind === "create-joker") {
      const ownedVoucherIds = useGame.getState().ownedVoucherIds;
      const capacity = MAX_JOKERS + extraJokerSlots(ownedVoucherIds);
      const created = createRandomJoker(
        jokers,
        availableJokerCatalog(useGame.getState()),
        capacity,
      );
      if (!created) return;
      play("pop");
      setJokers((prev) => [...prev, created]);
      consume();
      return;
    }
    if (effect.kind === "copy-last-consumable") {
      play("pop");
      consume();
      const last = useGame.getState().lastUsedConsumable;
      if (!last) return;
      if (last.kind === "tarot" && last.card.id === "the-fool") return;
      const ownedVoucherIds = useGame.getState().ownedVoucherIds;
      const capacity = MAX_CONSUMABLE_SLOTS + extraConsumableSlots(ownedVoucherIds);
      setConsumables((prev) => addConsumable(prev, last, capacity));
      return;
    }
    if (effect.kind === "create-consumables") {
      play("pop");
      consume();
      const ownedVoucherIds = useGame.getState().ownedVoucherIds;
      const capacity = MAX_CONSUMABLE_SLOTS + extraConsumableSlots(ownedVoucherIds);
      const rng = tarotRngConfig.rng;
      const tarotPool: ReadonlyArray<TarotCard> =
        effect.consumableKind === "tarot"
          ? createTarotCatalog().filter((t) => t.id !== entry.card.id)
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
        const current = useGame.getState().consumables;
        if (current.length + added.length >= capacity) break;
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
      if (added.length > 0) {
        setConsumables((prev) => [...prev, ...added]);
      }
      return;
    }
    if (effect.kind === "destroy-selected") {
      if (previewActive) {
        if (
          packPreviewSelectedIds.size === 0 ||
          packPreviewSelectedIds.size > effect.maxTargets
        ) {
          return;
        }
        play("pop");
        destroySelectedPreviewCards();
        consume();
        return;
      }
      if (selectedIds.size === 0 || selectedIds.size > effect.maxTargets) return;
      play("pop");
      const destroyedIds = new Set<number>();
      const destroyedCards: Card[] = [];
      for (const c of useGame.getState().dealt.hand) {
        if (selectedIds.has(c.id)) {
          destroyedIds.add(c.id);
          destroyedCards.push(c);
        }
      }
      setDestroyedCardIds((prev) => {
        const next = new Set(prev);
        for (const id of destroyedIds) next.add(id);
        return next;
      });
      setJokers((prev) => applyCardsDestroyedToJokerStates(prev, destroyedCards));
      setDealt((prev) => ({
        hand: prev.hand.filter((c) => !selectedIds.has(c.id)),
        remaining: prev.remaining,
      }));
      setSelectedIds(new Set());
      setSelectedHand(null);
      setChips(0);
      setMultiplier(0);
      consume();
      return;
    }
    if (effect.kind === "convert-suit") {
      if (previewActive) {
        if (
          packPreviewSelectedIds.size === 0 ||
          packPreviewSelectedIds.size > effect.maxTargets
        ) {
          return;
        }
        play("pop");
        applySuitToSelectedPreviewCards(effect.suit);
        consume();
        return;
      }
      if (selectedIds.size === 0 || selectedIds.size > effect.maxTargets) return;
      play("pop");
      const oldIds = new Set<number>();
      const replacements: Card[] = [];
      for (const c of useGame.getState().dealt.hand) {
        if (!selectedIds.has(c.id)) continue;
        oldIds.add(c.id);
        replacements.push({ ...c, suit: effect.suit });
      }
      setDestroyedCardIds((prev) => {
        const next = new Set(prev);
        for (const id of oldIds) next.add(id);
        return next;
      });
      setAddedCards((prev) => [
        ...prev,
        ...replacements.map((r) => ({ ...r, id: nextCardId() })),
      ]);
      const replacementById = new Map(replacements.map((r) => [r.id, r]));
      setDealt((prev) => ({
        hand: prev.hand.map((c) => replacementById.get(c.id) ?? c),
        remaining: prev.remaining,
      }));
      setSelectedIds(new Set());
      setSelectedHand(null);
      setChips(0);
      setMultiplier(0);
      consume();
      return;
    }
    if (effect.kind === "death-copy") {
      if (previewActive) {
        if (packPreviewSelectedIds.size !== effect.requiredTargets) return;
        play("pop");
        applyDeathCopyToSelectedPreviewCards();
        consume();
        return;
      }
      if (selectedIds.size !== effect.requiredTargets) return;
      const hand = useGame.getState().dealt.hand;
      const handById = new Map(hand.map((c) => [c.id, c]));
      const seen = new Set<number>();
      const orderedHand: Card[] = [];
      for (const id of handDisplayOrder) {
        const c = handById.get(id);
        if (c) {
          orderedHand.push(c);
          seen.add(id);
        }
      }
      for (const c of hand) {
        if (!seen.has(c.id)) orderedHand.push(c);
      }
      const selectedInOrder = orderedHand.filter((c) => selectedIds.has(c.id));
      if (selectedInOrder.length !== 2) return;
      const [left, right] = selectedInOrder;
      play("pop");
      const copied: Card = { ...right, id: left.id };
      setDealt((prev) => ({
        hand: prev.hand.map((c) => (c.id === left.id ? copied : c)),
        remaining: prev.remaining,
      }));
      setSelectedIds(new Set());
      setSelectedHand(null);
      setChips(0);
      setMultiplier(0);
      consume();
      return;
    }
    if (effect.kind === "rank-up-selected") {
      if (previewActive) {
        if (
          packPreviewSelectedIds.size === 0 ||
          packPreviewSelectedIds.size > effect.maxTargets
        ) {
          return;
        }
        play("pop");
        rankUpSelectedPreviewCards();
        consume();
        return;
      }
      if (selectedIds.size === 0 || selectedIds.size > effect.maxTargets) return;
      play("pop");
      const oldIds = new Set<number>();
      const replacements: Card[] = [];
      for (const c of useGame.getState().dealt.hand) {
        if (!selectedIds.has(c.id)) continue;
        oldIds.add(c.id);
        replacements.push({ ...c, rank: nextRankUp(c.rank) });
      }
      setDestroyedCardIds((prev) => {
        const next = new Set(prev);
        for (const id of oldIds) next.add(id);
        return next;
      });
      setAddedCards((prev) => [
        ...prev,
        ...replacements.map((r) => ({ ...r, id: nextCardId() })),
      ]);
      const replacementById = new Map(replacements.map((r) => [r.id, r]));
      setDealt((prev) => ({
        hand: prev.hand.map((c) => replacementById.get(c.id) ?? c),
        remaining: prev.remaining,
      }));
      setSelectedIds(new Set());
      setSelectedHand(null);
      setChips(0);
      setMultiplier(0);
      consume();
      return;
    }
    if (previewActive) {
      if (
        packPreviewSelectedIds.size === 0 ||
        packPreviewSelectedIds.size > effect.maxTargets
      ) {
        return;
      }
      play("pop");
      applyEnhancementToSelectedPreviewCards(effect.enhancement);
      consume();
      return;
    }
    if (selectedIds.size === 0 || selectedIds.size > effect.maxTargets) return;
    play("pop");
    setDealt((prev) => ({
      hand: prev.hand.map((c) =>
        selectedIds.has(c.id) ? { ...c, enhancement: effect.enhancement } : c,
      ),
      remaining: prev.remaining,
    }));
    setCardEnhancementsById((prev) => {
      const next = new Map(prev);
      for (const id of selectedIds) next.set(id, effect.enhancement);
      return next;
    });
    setSelectedIds(new Set());
    setSelectedHand(null);
    setChips(0);
    setMultiplier(0);
    consume();
  }

  return { useConsumable };
}
