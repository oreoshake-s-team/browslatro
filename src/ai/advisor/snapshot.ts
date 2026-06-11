import type { GameState } from "../../store/game";
import type { ModelStateInput } from "../modelState";
import type { SimulatePlayInput } from "../simulatePlay";

export function toSimulatePlayInput(state: GameState): SimulatePlayInput {
  return {
    dealt: state.dealt,
    baseDeckCards: state.baseDeckCards,
    destroyedCardIds: state.destroyedCardIds,
    addedCards: state.addedCards,
    cardEnhancementsById: state.cardEnhancementsById,
    cardSealsById: state.cardSealsById,
    jokers: state.jokers,
    handStats: state.handStats,
    handPlayCounts: state.handPlayCounts,
    handHistoryThisRound: state.handHistoryThisRound,
    playedCardKeysThisAnte: state.playedCardKeysThisAnte,
    consumables: state.consumables,
    ownedVoucherIds: state.ownedVoucherIds,
    blind: state.blind,
    currentBoss: state.currentBoss,
    money: state.money,
    remainingHands: state.remainingHands,
    remainingDiscards: state.remainingDiscards,
    runStats: state.runStats,
    todoHand: state.todoHand,
    idolTarget: state.idolTarget,
    ancientSuit: state.ancientSuit,
  };
}

export function toModelStateInput(state: GameState): ModelStateInput {
  return {
    dealt: state.dealt,
    jokers: state.jokers,
    blind: state.blind,
    ante: state.ante,
    round: state.round,
    currentBoss: state.currentBoss,
    selectedStake: state.selectedStake,
    money: state.money,
    remainingHands: state.remainingHands,
    remainingDiscards: state.remainingDiscards,
    roundScore: state.roundScore,
  };
}
