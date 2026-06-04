import { create } from "zustand";
import { createEconomySlice, type EconomyState } from "./economy";
import { createVouchersSlice, type VouchersState } from "./vouchers";
import { createStatsSlice, type StatsState } from "./stats";
import { createProgressionSlice, type ProgressionState } from "./progression";
import { createConsumablesSlice, type ConsumablesState } from "./consumables";
import { createJokersSlice, type JokersState } from "./jokers";
import { createShopSlice, type ShopState } from "./shop";
import { createPacksSlice, type PacksState } from "./packs";
import { createHandSlice, type HandState } from "./hand";
import { createScoringSlice, type ScoringState } from "./scoring";
import { createDevModifiersSlice, type DevModifiersState } from "./devModifiers";
import { createDeckSlice, type DeckState } from "./deck";
import { createDeck, resetCardIds } from "../cards/deck";
import { createBossSlice, type BossState } from "./boss";
import { createRunSlice, type RunState } from "./run";
import { createActionsSlice, type ActionsState } from "./actions";
import { createAnimationsSlice, type AnimationsState } from "./animations";

export interface GameState
  extends EconomyState, VouchersState, StatsState, ProgressionState,
    ConsumablesState, JokersState, ShopState, PacksState, HandState,
    ScoringState, DevModifiersState, DeckState, BossState, RunState,
    ActionsState, AnimationsState {
  resetGame: () => void;
}

export const useGame = create<GameState>()((set, get, store) => ({
  ...createEconomySlice(set, get, store),
  ...createVouchersSlice(set, get, store),
  ...createStatsSlice(set, get, store),
  ...createProgressionSlice(set, get, store),
  ...createConsumablesSlice(set, get, store),
  ...createJokersSlice(set, get, store),
  ...createShopSlice(set, get, store),
  ...createPacksSlice(set, get, store),
  ...createHandSlice(set, get, store),
  ...createScoringSlice(set, get, store),
  ...createDevModifiersSlice(set, get, store),
  ...createDeckSlice(set, get, store),
  ...createBossSlice(set, get, store),
  ...createRunSlice(set, get, store),
  ...createActionsSlice(set, get, store),
  ...createAnimationsSlice(set, get, store),
  resetGame: () => {
    const s = get();
    s.resetEconomy();
    s.resetVouchers();
    s.resetStats();
    s.setHandPlaySignal(0);
    s.resetProgression();
    s.resetConsumables();
    s.resetJokers();
    s.resetShop();
    s.resetPacks();
    s.resetHand();
    s.resetScoring();
    s.resetDevModifiers();
    s.resetDeck();
    resetCardIds();
    s.setBaseDeckCards(createDeck());
    s.resetBoss();
    s.resetRun();
    s.resetAnimations();
  },
}));
