import { useGame } from "../store/game";
import { consumableCapacityFor, handSizeFor, jokerCapacityFor } from "../items/capacities";
import { captureRunEvent } from "../ai/humanPlayWiring";
import { play } from "../components/system/sounds";
import type { Blind } from "../cards/types";
import {
  applyBossFaceDown,
  bossDisablesRandomJoker,
  bossHandSize,
  bossHidesJokers,
  bossPickerRngConfig,
  pickBossForAnte,
  type BossBlind,
} from "../items/bosses";
import {
  BASE_VOUCHER_SLOTS,
} from "../store/vouchers";
import {
  pickVouchersForAnte,
} from "../items/vouchers";
import {
  RANKS,
  SUITS,
  applyDeckCompositionTransforms,
  createDeck,
  nextCardId,
  resetCardIds,
  shuffle,
} from "../cards/deck";
import { fullDeckPile, initialDeal } from "../cards/deckBuild";
import { SEAL_KINDS, pickRandomTarot } from "../cards/seals";
import type { Card } from "../cards/types";
import { emptyHandCounts } from "../components/hud/handPlayCounts";
import type { HandLabel } from "../scoring/handEvaluator";
import {
  addConsumable,
} from "../items/consumables";
import {
  createJokerByRarity,
  createJokerCatalog,
  disablesBossBlindsFromJokers,
  initialJokersConfig,
  isJokerActive,
  resolveJokerEffect,
  sealedCardsOnRoundBeginFromJokers,
  stoneCardsOnBlindSelectFromJokers,
  type Joker,
  applyCeremonialDaggerOnBlindSelect,
  applyMadnessOnBlindSelect,
} from "../items/jokers";
import {
  clearJokerDisable,
  disableJokerAt,
  pickDisabledJokerIndex,
} from "../items/jokers/crimsonHeart";
import { initialRunStats, recordBlindSkipped, type RunStats } from "../run/runStats";
import {
  pruneTagsByCategory,
  resolveTagEffect,
  rollAnteSkipOffers,
  tagOfferRngConfig,
  type AnteSkipOffer,
  type TagId,
  getTagSpec,
} from "../items/tags";
import {
  deckCompositionTransforms,
  deckStartingMoneyDelta,
  type Deck,
} from "../items/decks";
import type { Stake } from "../items/stakes";
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
  readonly confirmRunSelection: (selection: {
    readonly stake: Stake;
    readonly deck: Deck;
  }) => void;
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
  const setIdolTarget = useGame((s) => s.setIdolTarget);
  const setAncientSuit = useGame((s) => s.setAncientSuit);
  const setCastleSuit = useGame((s) => s.setCastleSuit);
  const setRebateRank = useGame((s) => s.setRebateRank);
  const setTodoHand = useGame((s) => s.setTodoHand);
  const setRecentBossIds = useGame((s) => s.setRecentBossIds);
  const handSizeModifier = useGame((s) => s.handSizeModifier);
  const setHandSizeModifier = useGame((s) => s.setHandSizeModifier);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const equippedJokers = useGame((s) => s.jokers);
  const selectedDeck = useGame((s) => s.selectedDeck);
  const selectedStake = useGame((s) => s.selectedStake);
  const setSelectedStake = useGame((s) => s.setSelectedStake);
  const setSelectedDeck = useGame((s) => s.setSelectedDeck);
  const setEndlessMode = useGame((s) => s.setEndlessMode);
  const setPendingGameWon = useGame((s) => s.setPendingGameWon);
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
  const cardEditionsById = useGame((s) => s.cardEditionsById);
  const setCardEditionsById = useGame((s) => s.setCardEditionsById);
  const pendingNextRoundHandSize = useGame((s) => s.pendingNextRoundHandSize);
  const setPendingNextRoundHandSize = useGame(
    (s) => s.setPendingNextRoundHandSize,
  );
  const pendingDouble = useGame((s) => s.pendingDouble);
  const setPendingDouble = useGame((s) => s.setPendingDouble);
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
  const setNewlyDrawnIds = useGame((s) => s.setNewlyDrawnIds);
  const setSelectedHand = useGame((s) => s.setSelectedHand);
  const setChips = useGame((s) => s.setChips);
  const setMultiplier = useGame((s) => s.setMultiplier);
  const setLuckyMultProcIds = useGame((s) => s.setLuckyMultProcIds);
  const setLuckyMoneyProcIds = useGame((s) => s.setLuckyMoneyProcIds);
  const setScoringEvents = useGame((s) => s.setScoringEvents);
  const setPendingWin = useGame((s) => s.setPendingWin);
  const setPendingLose = useGame((s) => s.setPendingLose);

  const currentHandSize = handSizeFor({
    handSizeModifier,
    ownedVoucherIds,
    jokers: equippedJokers,
  });

  function startNewRound(opts: {
    blind?: Blind;
    boss?: BossBlind | null;
    handSizeOverride?: number;
  } = {}): void {
    const effectiveBlind = opts.blind ?? blind;
    const pickedBoss = opts.boss !== undefined ? opts.boss : currentBoss;
    const isBossRound = effectiveBlind === 3;
    const effectiveBoss =
      isBossRound &&
      pickedBoss !== null &&
      pickedBoss.effect.kind !== "none" &&
      disablesBossBlindsFromJokers(equippedJokers)
        ? { ...pickedBoss, effect: { kind: "none" as const } }
        : pickedBoss;
    if (effectiveBoss !== pickedBoss && effectiveBoss !== null) {
      setCurrentBoss(effectiveBoss);
    }
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
    const deckForTargets = [...baseDeckCards, ...addedCards].filter(
      (c) => !destroyedCardIds.has(c.id),
    );
    const activeForBlind = equippedJokers.filter(isJokerActive);
    const needsIdol = activeForBlind.some(
      (_, i) => resolveJokerEffect(activeForBlind, i).kind === "x-mult-on-idol-card",
    );
    if (needsIdol && deckForTargets.length > 0) {
      const pick =
        deckForTargets[Math.floor(Math.random() * deckForTargets.length)];
      setIdolTarget({ rank: pick.rank, suit: pick.suit });
    } else {
      setIdolTarget(null);
    }
    setAncientSuit(
      activeForBlind.some((_, i) => resolveJokerEffect(activeForBlind, i).kind === "x-mult-per-suit-rotating")
        ? SUITS[Math.floor(Math.random() * SUITS.length)]
        : null,
    );
    if (activeForBlind.some((_, i) => resolveJokerEffect(activeForBlind, i).kind === "money-on-todo-hand")) {
      const labels = Object.keys(emptyHandCounts()) as HandLabel[];
      setTodoHand(labels[Math.floor(Math.random() * labels.length)]);
    } else {
      setTodoHand(null);
    }
    setJokers((prev) => applyCeremonialDaggerOnBlindSelect(prev));
    if (effectiveBlind !== 3) {
      setJokers((prev) => applyMadnessOnBlindSelect(prev));
    }
    if (isBossRound && bossHidesJokers(effectiveBoss)) {
      setJokers((prev) => shuffle(prev));
    }
    setJokers((prev) => clearJokerDisable(prev));
    if (isBossRound && bossDisablesRandomJoker(effectiveBoss)) {
      setJokers((prev) => disableJokerAt(prev, pickDisabledJokerIndex(prev)));
    }
    setRebateRank(
      activeForBlind.some(
        (_, i) => resolveJokerEffect(activeForBlind, i).kind === "money-per-discarded-rebate-rank",
      )
        ? RANKS[Math.floor(Math.random() * RANKS.length)]
        : null,
    );
    setCastleSuit(
      activeForBlind.some(
        (_, i) => resolveJokerEffect(activeForBlind, i).kind === "stack-chips-per-rotating-suit-discard",
      )
        ? SUITS[Math.floor(Math.random() * SUITS.length)]
        : null,
    );
    let blindTarots = 0;
    for (let i = 0; i < activeForBlind.length; i += 1) {
      if (resolveJokerEffect(activeForBlind, i).kind === "blind-select-creates-tarot") blindTarots += 1;
    }
    if (blindTarots > 0) {
      const tarotCapacity =
        consumableCapacityFor(ownedVoucherIds);
      setConsumables((prev) => {
        let next = prev;
        for (let i = 0; i < blindTarots; i += 1) {
          const after = addConsumable(
            next,
            { kind: "tarot", card: pickRandomTarot() },
            tarotCapacity,
          );
          if (after === next) break;
          next = after;
        }
        return next;
      });
    }
    let commonJokerCreations = 0;
    for (let i = 0; i < activeForBlind.length; i += 1) {
      const eff = resolveJokerEffect(activeForBlind, i);
      if (eff.kind === "blind-select-creates-common-jokers") commonJokerCreations += eff.count;
    }
    if (commonJokerCreations > 0) {
      const jokerCapacity = jokerCapacityFor(ownedVoucherIds, selectedDeck);
      setJokers((prev) => {
        let next = prev as ReadonlyArray<Joker>;
        for (let i = 0; i < commonJokerCreations; i += 1) {
          const created = createJokerByRarity(
            next,
            createJokerCatalog(),
            "common",
            jokerCapacity,
          );
          if (!created) break;
          next = [...next, created];
        }
        return [...next];
      });
    }
    const stoneCount = stoneCardsOnBlindSelectFromJokers(equippedJokers);
    const newStones: Card[] = Array.from({ length: stoneCount }, () => ({
      id: nextCardId(),
      rank: RANKS[Math.floor(Math.random() * RANKS.length)],
      suit: SUITS[Math.floor(Math.random() * SUITS.length)],
      enhancement: "stone",
    }));
    const sealedCount = sealedCardsOnRoundBeginFromJokers(equippedJokers);
    const newSealed: Card[] = Array.from({ length: sealedCount }, () => ({
      id: nextCardId(),
      rank: RANKS[Math.floor(Math.random() * RANKS.length)],
      suit: SUITS[Math.floor(Math.random() * SUITS.length)],
      seal: SEAL_KINDS[Math.floor(Math.random() * SEAL_KINDS.length)],
    }));
    const addedWithStones =
      newStones.length > 0 ? [...addedCards, ...newStones] : addedCards;
    if (newStones.length > 0 || newSealed.length > 0) {
      setAddedCards([...addedWithStones, ...newSealed]);
    }
    const fresh = initialDeal(
      baseDeckCards,
      destroyedCardIds,
      handSize,
      addedWithStones,
      cardEnhancementsById,
      cardSealsById,
      cardEditionsById,
    );
    setDealt({
      hand: [
        ...applyBossFaceDown(fresh.hand, effectiveBoss, isBossRound, "initial"),
        ...newSealed,
      ],
      remaining: fresh.remaining,
    });
    setSelectedIds(new Set());
    setDiscardingIds(new Set());
    setNewlyDrawnIds(new Set());
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

  function resetForNewRun(deck: Deck): void {
    setBlind(1);
    setRound(1);
    setAnte(1);
    setEndlessMode(false);
    setPendingGameWon(null);
    useGame.getState().resetEconomy();
    const moneyDelta = deckStartingMoneyDelta(deck);
    if (moneyDelta !== 0) {
      useGame.getState().setMoney(useGame.getState().money + moneyDelta);
    }
    setHandSizeModifier(0);
    setPendingNextRoundHandSize(0);
    setPendingDouble(false);
    setDevChipsBonus(0);
    setDevMultBonus(0);
    setDevMultFactor(1);
    setForceProbabilities(false);
    setJokers(initialJokersConfig.factory());
    useGame.getState().resetStats();
    resetCardIds();
    const freshBaseDeck = applyDeckCompositionTransforms(
      createDeck(),
      deckCompositionTransforms(deck),
    );
    setBaseDeckCards(freshBaseDeck);
    setDestroyedCardIds(new Set());
    setAddedCards([]);
    setCardEnhancementsById(new Map());
    setCardSealsById(new Map());
    setCardEditionsById(new Map());
    setDealt(fullDeckPile(freshBaseDeck));
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
    const store = useGame.getState();
    store.resetConsumables();
    store.resetHand();
    store.resetShop();
    store.resetPacks();
    store.resetScoring();
    store.resetAnimations();
    store.resetLastUsedConsumable();
    store.setHandPlaySignal(0);
    resetDiscardPipeline();
    resetScoring();
    setPendingBlindSelect(true);
  }

  function startNewGame(): void {
    resetForNewRun(selectedDeck);
    setPendingRunSelect(true);
  }

  function confirmRunSelection(selection: {
    readonly stake: Stake;
    readonly deck: Deck;
  }): void {
    setSelectedStake(selection.stake);
    setSelectedDeck(selection.deck);
    resetForNewRun(selection.deck);
    setPendingRunSelect(false);
  }

  function loseGame(info: RoundLostInfo): void {
    play("lose");
    setPendingLose(info);
  }

  function skipBlind(): void {
    if (blind === 3) return;
    const offered = blind === 1 ? skipTagOffers.small : skipTagOffers.big;
    const effect = resolveTagEffect(offered.id);
    captureRunEvent(useGame.getState(), {
      kind: "blind-skip",
      tag: { id: offered.id, name: getTagSpec(offered.id).name },
    });
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

  return { startNewRound, startNewGame, confirmRunSelection, loseGame, skipBlind };
}
