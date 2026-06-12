import { cardKey, deal, shuffle, HAND_SIZE } from "../cards/deck";
import type { Blind, Card, Rank, Suit } from "../cards/types";
import { FINAL_ANTE } from "../constants";
import { pickBossForAnte } from "../items/bosses";
import { DEFAULT_DECK } from "../items/decks";
import type { Joker, RandomSource } from "../items/jokers/types";
import { createJokerCatalog } from "../items/jokers/catalog";
import { createPlanetCatalog } from "../items/planets";
import { createSpectralCatalog } from "../items/spectrals";
import { createTarotCatalog } from "../items/tarots";
import type { ShopItem } from "../items/shop";
import { pickShopItemOffers, rerollCostFor } from "../items/shop";
import { DEFAULT_STAKE, type Stake } from "../items/stakes";
import type { VoucherId } from "../items/vouchers";
import { emptyHandCounts } from "../components/hud/handPlayCounts";
import { requiredChipsForBlind } from "../scoring/anteScaling";
import type { HandLabel } from "../scoring/handEvaluator";
import { createDefaultHandStats } from "../scoring/handStats";
import {
  computeStartingDiscards,
  computeStartingHands,
} from "../run/roundSetup";
import { simulatePlay, type SimulatePlayInput } from "./simulatePlay";

export function seededRng(seed: number): RandomSource {
  let a = seed >>> 0;
  return (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SUITS: ReadonlyArray<Suit> = ["spades", "hearts", "diamonds", "clubs"];
const RANKS: ReadonlyArray<Rank> = [
  "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A",
];

export function buildHeadlessDeck(): Card[] {
  const cards: Card[] = [];
  let id = 0;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({ id: ++id, rank, suit });
    }
  }
  return cards;
}

export type AgentAction =
  | { readonly kind: "play"; readonly cardIds: ReadonlyArray<number> }
  | { readonly kind: "discard"; readonly cardIds: ReadonlyArray<number> };

export interface HeadlessRoundView extends SimulatePlayInput {
  readonly ante: number;
  readonly round: number;
  readonly selectedStake: Stake;
  readonly roundScore: number;
  readonly scoreTarget: number;
}

export interface HeadlessAgent {
  readonly name: string;
  chooseAction(view: HeadlessRoundView): AgentAction | Promise<AgentAction>;
}

export interface ShopContext {
  readonly ante: number;
  readonly money: number;
  readonly jokers: ReadonlyArray<Joker>;
  readonly offers: ReadonlyArray<ShopItem>;
  readonly rerollCount: number;
  readonly rng: RandomSource;
}

export type ShopAction =
  | { readonly kind: "buy"; readonly offer: ShopItem }
  | { readonly kind: "reroll" }
  | { readonly kind: "leave" };

export interface HeadlessShopAgent {
  chooseShopAction(ctx: ShopContext): ShopAction | Promise<ShopAction>;
}

export interface HeadlessRunConfig {
  readonly seed: number;
  readonly maxAnte?: number;
  readonly jokers?: ReadonlyArray<Joker>;
  readonly stake?: Stake;
  readonly shopAgent?: HeadlessShopAgent;
}

export interface HeadlessRunResult {
  readonly won: boolean;
  readonly anteReached: number;
  readonly blindsCleared: number;
  readonly handsPlayed: number;
}

const STARTING_MONEY = 4;
const BLIND_CLEAR_REWARD_BASE = 2;
const MAX_DISCARD_SIZE = 5;
const MAX_SHOP_STEPS = 20;

interface ShopCatalogs {
  readonly jokerCatalog: ReadonlyArray<Joker>;
  readonly planetCatalog: ReturnType<typeof createPlanetCatalog>;
  readonly tarotCatalog: ReturnType<typeof createTarotCatalog>;
  readonly spectralCatalog: ReturnType<typeof createSpectralCatalog>;
}

function buildShopCatalogs(): ShopCatalogs {
  return {
    jokerCatalog: createJokerCatalog(),
    planetCatalog: createPlanetCatalog(),
    tarotCatalog: createTarotCatalog(),
    spectralCatalog: createSpectralCatalog(),
  };
}

function generateOffers(
  catalogs: ShopCatalogs,
  ownedJokerIds: ReadonlyArray<string>,
  rng: RandomSource,
): ReadonlyArray<ShopItem> {
  return pickShopItemOffers({
    ...catalogs,
    excludedJokerIds: ownedJokerIds,
    rng,
  });
}

async function runShopPhase(
  agent: HeadlessShopAgent,
  ante: number,
  initialMoney: number,
  initialJokers: ReadonlyArray<Joker>,
  rng: RandomSource,
  catalogs: ShopCatalogs,
): Promise<{ readonly money: number; readonly jokers: ReadonlyArray<Joker> }> {
  let rerollCount = 0;
  let money = initialMoney;
  let jokers = initialJokers;
  let offers = generateOffers(catalogs, jokers.map((j) => j.id), rng);

  for (let step = 0; step < MAX_SHOP_STEPS; step += 1) {
    const action = await agent.chooseShopAction({ ante, money, jokers, offers, rerollCount, rng });
    if (action.kind === "leave") break;
    if (action.kind === "reroll") {
      const cost = rerollCostFor(rerollCount);
      if (money < cost) break;
      money -= cost;
      rerollCount += 1;
      offers = generateOffers(catalogs, jokers.map((j) => j.id), rng);
    } else if (action.kind === "buy") {
      const { offer } = action;
      if (offer.sold || offer.price > money) break;
      money -= offer.price;
      if (offer.kind === "joker") jokers = [...jokers, offer.joker];
      offers = offers.map((o) => (o === offer ? { ...o, sold: true } : o));
    }
  }
  return { money, jokers };
}

export interface Pile {
  readonly hand: ReadonlyArray<Card>;
  readonly remaining: ReadonlyArray<Card>;
}

export function removeAndRefill(
  pile: Pile,
  cardIds: ReadonlyArray<number>,
): Pile {
  const removed = new Set(cardIds);
  const kept = pile.hand.filter((c) => !removed.has(c.id));
  const drawCount = Math.min(
    pile.hand.length - kept.length,
    pile.remaining.length,
  );
  return {
    hand: [...kept, ...pile.remaining.slice(0, drawCount)],
    remaining: pile.remaining.slice(drawCount),
  };
}

export async function playHeadlessRun(
  agent: HeadlessAgent,
  config: HeadlessRunConfig,
): Promise<HeadlessRunResult> {
  const rng = seededRng(config.seed);
  const maxAnte = config.maxAnte ?? FINAL_ANTE;
  let currentJokers: ReadonlyArray<Joker> = config.jokers ?? [];
  const stake = config.stake ?? DEFAULT_STAKE;
  const shopCatalogs = config.shopAgent ? buildShopCatalogs() : null;
  const deck = buildHeadlessDeck();
  const handStats = createDefaultHandStats();
  const ownedVoucherIds: ReadonlySet<VoucherId> = new Set();
  const recentBossIds = new Set<string>();

  let money = STARTING_MONEY;
  let blindsCleared = 0;
  let handsPlayed = 0;
  let handPlayCounts = emptyHandCounts();

  for (let ante = 1; ante <= maxAnte; ante += 1) {
    const boss = pickBossForAnte({ ante, rng, recentIds: recentBossIds });
    recentBossIds.add(boss.id);
    const playedCardKeysThisAnte = new Set<string>();

    const playRound = async (blind: Blind): Promise<boolean> => {
      const startCtx = {
        blind,
        boss,
        ownedVoucherIds,
        deck: DEFAULT_DECK,
        jokers: currentJokers,
        stake,
      };
      let remainingHands = computeStartingHands(startCtx);
      let remainingDiscards = computeStartingDiscards(startCtx);
      const scoreTarget = requiredChipsForBlind({ ante, blind, boss, stake });
      let pile: Pile = deal(shuffle(deck, rng), HAND_SIZE);
      let roundScore = 0;
      const handHistoryThisRound: HandLabel[] = [];

      while (remainingHands > 0) {
        if (pile.hand.length === 0) return false;
        const view: HeadlessRoundView = {
          dealt: pile,
          baseDeckCards: deck,
          destroyedCardIds: new Set(),
          addedCards: [],
          cardEnhancementsById: new Map(),
          cardSealsById: new Map(),
          jokers: currentJokers,
          handStats,
          handPlayCounts,
          handHistoryThisRound,
          playedCardKeysThisAnte,
          consumables: [],
          ownedVoucherIds,
          blind,
          currentBoss: boss,
          money,
          remainingHands,
          remainingDiscards,
          runStats: { blindsSkipped: 0 },
          todoHand: null,
          idolTarget: null,
          ancientSuit: null,
          ante,
          round: blindsCleared + 1,
          selectedStake: stake,
          roundScore,
          scoreTarget,
        };
        const action = await agent.chooseAction(view);
        if (action.kind === "discard") {
          if (remainingDiscards <= 0) {
            throw new Error(`${agent.name} discarded with none remaining`);
          }
          if (
            action.cardIds.length === 0 ||
            action.cardIds.length > MAX_DISCARD_SIZE
          ) {
            throw new Error(
              `${agent.name} discarded ${action.cardIds.length} cards`,
            );
          }
          remainingDiscards -= 1;
          pile = removeAndRefill(pile, action.cardIds);
          continue;
        }
        const result = simulatePlay(view, action.cardIds);
        if (!result.legal) {
          if (result.reason === "boss-blocks-hand") return false;
          throw new Error(
            `${agent.name} made an illegal play: ${result.reason}`,
          );
        }
        handsPlayed += 1;
        roundScore += result.score;
        handPlayCounts = {
          ...handPlayCounts,
          [result.handLabel]: handPlayCounts[result.handLabel] + 1,
        };
        handHistoryThisRound.push(result.handLabel);
        for (const id of action.cardIds) {
          const played = pile.hand.find((c) => c.id === id);
          if (played !== undefined) {
            playedCardKeysThisAnte.add(cardKey(played));
          }
        }
        if (roundScore >= scoreTarget) return true;
        remainingHands -= 1;
        pile = removeAndRefill(pile, action.cardIds);
      }
      return false;
    };

    for (const blind of [1, 2, 3] as const) {
      if (!(await playRound(blind))) {
        return { won: false, anteReached: ante, blindsCleared, handsPlayed };
      }
      blindsCleared += 1;
      money += blind + BLIND_CLEAR_REWARD_BASE;
    }
    if (config.shopAgent && shopCatalogs) {
      const result = await runShopPhase(config.shopAgent, ante, money, currentJokers, rng, shopCatalogs);
      money = result.money;
      currentJokers = result.jokers;
    }
  }
  return { won: true, anteReached: maxAnte, blindsCleared, handsPlayed };
}
