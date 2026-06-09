import { useGame } from "../store/game";
import { play } from "../components/system/sounds";
import type { Blind } from "../cards/types";
import {
  applyBossFaceDown,
  bossHandSize,
  bossPickerRngConfig,
  pickBossForAnte,
  type BossBlind,
} from "../items/bosses";
import {
  BASE_VOUCHER_SLOTS,
} from "../store/vouchers";
import {
  extraHandSize,
  pickVouchersForAnte,
} from "../items/vouchers";
import {
  HAND_SIZE,
  applyDeckCompositionTransforms,
  createDeck,
  resetCardIds,
} from "../cards/deck";
import { initialDeal } from "../cards/deckBuild";
import {
  extraStartingHandSizeFromJokers,
  initialJokersConfig,
} from "../items/jokers";
import { initialRunStats, recordBlindSkipped, type RunStats } from "../run/runStats";
import {
  pruneTagsByCategory,
  resolveTagEffect,
  rollAnteSkipOffers,
  tagOfferRngConfig,
  type AnteSkipOffer,
  type TagId,
} from "../items/tags";
import {
  deckCompositionTransforms,
  deckStartingMoneyDelta,
} from "../items/decks";
import {
  computeStartingDiscards,
  computeStartingHands,
} from "../run/roundSetup";
import type { RoundLostInfo } from "../components/game/RoundLostModal";

export interface UseRoundLifecycleParams {
  readonly applyGainedTag: (
    offer: AnteSkipOffer | TagId,
    nextStats: RunStats,
  ) => void;
  readonly resetScoring: () => void;
  readonly resetDiscardPipeline: () => void;
}

export interface UseRoundLifecycleResult {
  readonly startNewRound: (opts?: {
    blind?: Blind;
    boss?: BossBlind | null;
    handSizeOverride?: number;
  }) => void;
  readonly startNewGame: () => void;
  readonly loseGame: (info: RoundLostInfo) => void;
  readonly skipBlind: () => void;
}

export function useRoundLifecycle({
  applyGainedTag,
  resetScoring,
  resetDiscardPipeline,
}: UseRoundLifecycleParams): UseRoundLifecycleResult {
  const blind = useGame((s) => s.blind);
  const setBlind = useGame((s) => s.setBlind);
  const setRound = useGame((s) => s.setRound);
  const setAnte = useGame((s) => s.setAnte);
  const currentBoss = useGame((s) => s.currentBoss);
  const setCurrentBoss = useGame((s) => s.setCurrentBoss);
  const setRecentBossIds = useGame((s) => s.setRecentBossIds);
  const handSizeModifier = useGame((s) => s.handSizeModifier);
  const setHandSizeModifier = useGame((s) => s.setHandSizeModifier);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const equippedJokers = useGame((s) => s.jokers);
  const selectedDeck = useGame((s) => s.selectedDeck);
  const selectedStake = useGame((s) => s.selectedStake);
  const setCurrentAnteVouchers = useGame((s) => s.setCurrentAnteVouchers);
  const baseDeckCards = useGame((s) => s.baseDeckCards);
  const setBaseDeckCards = useGame((s) => s.setBaseDeckCards);
  const destroyedCardIds = useGame((s) => s.destroyedCardIds);
  const setDestroyedCardIds = useGame((s) => s.setDestroyedCardIds);
  const addedCards = useGame((s) => s.addedCards);
  const setAddedCards = useGame((s) => s.setAddedCards);
  const cardEnhancementsById = useGame((s) => s.cardEnhancementsById);
  const setCardEnhancementsById = useGame((s) => s.setCardEnhancementsById);
  const cardSealsById = useGame((s) => s.cardSealsById);
  const setCardSealsById = useGame((s) => s.setCardSealsById);
  const pendingNextRoundHandSize = useGame((s) => s.pendingNextRoundHandSize);
  const setPendingNextRoundHandSize = useGame(
    (s) => s.setPendingNextRoundHandSize,
  );
  const pendingDouble = useGame((s) => s.pendingDouble);
  const setPendingDouble = useGame((s) => s.setPendingDouble);
  const setExtraPackSlots = useGame((s) => s.setExtraPackSlots);
  const setPendingForcedPacks = useGame((s) => s.setPendingForcedPacks);
  const setDevChipsBonus = useGame((s) => s.setDevChipsBonus);
  const setDevMultBonus = useGame((s) => s.setDevMultBonus);
  const setDevMultFactor = useGame((s) => s.setDevMultFactor);
  const setForceProbabilities = useGame((s) => s.setForceProbabilities);
  const setJokers = useGame((s) => s.setJokers);
  const setConsumables = useGame((s) => s.setConsumables);
  const setPendingTags = useGame((s) => s.setPendingTags);
  const runStats = useGame((s) => s.runStats);
  const setRunStats = useGame((s) => s.setRunStats);
  const skipTagOffers = useGame((s) => s.skipTagOffers);
  const setSkipTagOffers = useGame((s) => s.setSkipTagOffers);
  const setPendingShopMods = useGame((s) => s.setPendingShopMods);
  const setPlayedCardKeysThisAnte = useGame(
    (s) => s.setPlayedCardKeysThisAnte,
  );
  const setHandHistoryThisRound = useGame((s) => s.setHandHistoryThisRound);
  const setPendingBlindSelect = useGame((s) => s.setPendingBlindSelect);
  const setPendingRunSelect = useGame((s) => s.setPendingRunSelect);
  const setRoundScore = useGame((s) => s.setRoundScore);
  const setRemainingHands = useGame((s) => s.setRemainingHands);
  const setRemainingDiscards = useGame((s) => s.setRemainingDiscards);
  const setDiscardsUsedThisRound = useGame((s) => s.setDiscardsUsedThisRound);
  const setDealt = useGame((s) => s.setDealt);
  const setSelectedIds = useGame((s) => s.setSelectedIds);
  const setDiscardingIds = useGame((s) => s.setDiscardingIds);
  const setSelectedHand = useGame((s) => s.setSelectedHand);
  const setChips = useGame((s) => s.setChips);
  const setMultiplier = useGame((s) => s.setMultiplier);
  const setLuckyMultProcIds = useGame((s) => s.setLuckyMultProcIds);
  const setLuckyMoneyProcIds = useGame((s) => s.setLuckyMoneyProcIds);
  const setScoringEvents = useGame((s) => s.setScoringEvents);
  const setPendingWin = useGame((s) => s.setPendingWin);
  const setPendingLose = useGame((s) => s.setPendingLose);

  const currentHandSize = Math.max(
    1,
    HAND_SIZE +
      handSizeModifier +
      extraHandSize(ownedVoucherIds) +
      extraStartingHandSizeFromJokers(equippedJokers),
  );

  function startNewRound(opts: {
    blind?: Blind;
    boss?: BossBlind | null;
    handSizeOverride?: number;
  } = {}): void {
    const effectiveBlind = opts.blind ?? blind;
    const effectiveBoss =
      opts.boss !== undefined ? opts.boss : currentBoss;
    const isBossRound = effectiveBlind === 3;
    const baseHandSize =
      (opts.handSizeOverride ?? currentHandSize) + pendingNextRoundHandSize;
    if (pendingNextRoundHandSize !== 0) {
      setPendingNextRoundHandSize(0);
      setPendingTags((prev) => pruneTagsByCategory(prev, "next-round"));
    }
    const resourceCtx = {
      blind: effectiveBlind,
      boss: effectiveBoss,
      ownedVoucherIds,
      deck: selectedDeck,
      jokers: equippedJokers,
      stake: selectedStake,
    };
    const startingHands = computeStartingHands(resourceCtx);
    const startingDiscards = computeStartingDiscards(resourceCtx);
    const handSize = isBossRound
      ? bossHandSize(effectiveBoss, baseHandSize)
      : baseHandSize;
    setRoundScore(0);
    setRemainingHands(startingHands);
    setRemainingDiscards(startingDiscards);
    setDiscardsUsedThisRound(0);
    setHandHistoryThisRound([]);
    const fresh = initialDeal(
      baseDeckCards,
      destroyedCardIds,
      handSize,
      addedCards,
      cardEnhancementsById,
      cardSealsById,
    );
    setDealt({
      hand: applyBossFaceDown(fresh.hand, effectiveBoss, isBossRound, "initial"),
      remaining: fresh.remaining,
    });
    setSelectedIds(new Set());
    setDiscardingIds(new Set());
    setSelectedHand(null);
    setChips(0);
    setMultiplier(0);
    resetDiscardPipeline();
    resetScoring();
    setLuckyMultProcIds(new Set());
    setLuckyMoneyProcIds(new Set());
    setScoringEvents([]);
    setPendingWin(null);
  }

  function startNewGame(): void {
    setBlind(1);
    setRound(1);
    setAnte(1);
    useGame.getState().resetEconomy();
    const moneyDelta = deckStartingMoneyDelta(selectedDeck);
    if (moneyDelta !== 0) {
      useGame.getState().setMoney(useGame.getState().money + moneyDelta);
    }
    setHandSizeModifier(0);
    setPendingNextRoundHandSize(0);
    setPendingDouble(false);
    setExtraPackSlots(0);
    setPendingForcedPacks([]);
    setDevChipsBonus(0);
    setDevMultBonus(0);
    setDevMultFactor(1);
    setForceProbabilities(false);
    setJokers(initialJokersConfig.factory());
    useGame.getState().resetStats();
    resetCardIds();
    setBaseDeckCards(
      applyDeckCompositionTransforms(
        createDeck(),
        deckCompositionTransforms(selectedDeck),
      ),
    );
    setDestroyedCardIds(new Set());
    setAddedCards([]);
    setCardEnhancementsById(new Map());
    setCardSealsById(new Map());
    setConsumables([]);
    useGame.getState().resetVouchers();
    setCurrentAnteVouchers(
      pickVouchersForAnte({ ante: 1, ownedIds: new Set() }, BASE_VOUCHER_SLOTS),
    );
    setRecentBossIds(new Set());
    const freshBoss = pickBossForAnte({
      ante: 1,
      rng: bossPickerRngConfig.rng,
    });
    setCurrentBoss(freshBoss);
    setPendingTags([]);
    setRunStats(initialRunStats());
    setSkipTagOffers(rollAnteSkipOffers(tagOfferRngConfig.rng));
    setPendingShopMods([]);
    setPlayedCardKeysThisAnte(new Set());
    setHandHistoryThisRound([]);
    setPendingBlindSelect(true);
    setPendingRunSelect(true);
  }

  function loseGame(info: RoundLostInfo): void {
    play("lose");
    setPendingLose(info);
  }

  function skipBlind(): void {
    if (blind === 3) return;
    const offered = blind === 1 ? skipTagOffers.small : skipTagOffers.big;
    const effect = resolveTagEffect(offered.id);
    const nextStats = recordBlindSkipped(runStats);
    setBlind((prev) => (prev + 1) as Blind);
    setRound((prev) => prev + 1);
    setRunStats(nextStats);
    if (effect.category === "duplicate-next") {
      setPendingTags((prev) => [...prev, offered.id]);
      setPendingDouble(true);
      return;
    }
    const times = pendingDouble ? 2 : 1;
    if (pendingDouble) {
      setPendingDouble(false);
      setPendingTags((prev) => pruneTagsByCategory(prev, "duplicate-next", "first"));
    }
    for (let i = 0; i < times; i += 1) applyGainedTag(offered, nextStats);
  }

  return { startNewRound, startNewGame, loseGame, skipBlind };
}
