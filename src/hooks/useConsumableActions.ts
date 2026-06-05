import { useGame } from "../store/game";
import { play } from "../components/system/sounds";
import { applyPlanetUpgrade } from "../items/planets";
import { removeConsumableAt } from "../items/consumables";
import { applyAuraToSelectedInHand, duplicateSelectedInHand } from "../items/spectrals";
import {
  nextRankUp,
  resolveHermitPayout,
  resolveTemperancePayout,
  rollWheelOfFortune,
} from "../items/tarots";
import { withEdition } from "../items/jokers";
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
  const applySpectralEffect = useGame((s) => s.applySpectralEffect);
  const setDestroyedCardIds = useGame((s) => s.setDestroyedCardIds);
  const setAddedCards = useGame((s) => s.setAddedCards);
  const setLastUsedConsumable = useGame((s) => s.setLastUsedConsumable);
  const handDisplayOrder = useGame((s) => s.handDisplayOrder);

  function useConsumable(consumableIdx: number): void {
    const entry = consumables[consumableIdx];
    if (!entry) return;
    const previewActive = openedPack !== null && packPreviewHand.length > 0;
    function consume(): void {
      const idx = consumableIdx;
      setConsumables((prev) => removeConsumableAt(prev, idx));
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
        setSelectedIds(new Set());
        setSelectedHand(null);
        setChips(0);
        setMultiplier(0);
        consume();
        return;
      }
      if (spectralEffect.kind === "duplicate-selected") {
        if (previewActive) return;
        if (selectedIds.size !== spectralEffect.maxTargets) return;
        play("pop");
        setDealt((prev) => ({
          hand: duplicateSelectedInHand(prev.hand, selectedIds, spectralEffect.copies),
          remaining: prev.remaining,
        }));
        setSelectedIds(new Set());
        setSelectedHand(null);
        setChips(0);
        setMultiplier(0);
        consume();
        return;
      }
      if (spectralEffect.kind === "aura") {
        if (previewActive) return;
        if (selectedIds.size !== spectralEffect.maxTargets) return;
        play("pop");
        setDealt((prev) => ({
          hand: applyAuraToSelectedInHand(prev.hand, selectedIds, Math.random),
          remaining: prev.remaining,
        }));
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
    if (effect.kind === "destroy-selected") {
      if (previewActive) return;
      if (selectedIds.size === 0 || selectedIds.size > effect.maxTargets) return;
      play("pop");
      const destroyedIds = new Set<number>();
      for (const c of useGame.getState().dealt.hand) {
        if (selectedIds.has(c.id)) destroyedIds.add(c.id);
      }
      setDestroyedCardIds((prev) => {
        const next = new Set(prev);
        for (const id of destroyedIds) next.add(id);
        return next;
      });
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
      if (previewActive) return;
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
      if (previewActive) return;
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
    setSelectedIds(new Set());
    setSelectedHand(null);
    setChips(0);
    setMultiplier(0);
    consume();
  }

  return { useConsumable };
}
