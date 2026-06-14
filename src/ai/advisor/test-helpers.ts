import type { HandOption } from "../getHandOptions";
import type { ModelState } from "../modelState";
import type {
  BlindAdviceCandidate,
  BlindAdviceRequest,
  BlindAdviceState,
  HandAdviceRequest,
  PackAdviceCandidate,
  PackAdviceRequest,
  PackAdviceState,
  ShopAdviceCandidate,
  ShopAdviceRequest,
  ShopAdviceState,
} from "./types";

export function modelStateFixture(): ModelState {
  return {
    hand: [
      {
        id: 1,
        faceDown: false,
        rank: "9",
        suit: "hearts",
        enhancement: null,
        seal: null,
        edition: null,
        bonusChips: 0,
      },
      {
        id: 2,
        faceDown: false,
        rank: "9",
        suit: "spades",
        enhancement: null,
        seal: null,
        edition: null,
        bonusChips: 0,
      },
    ],
    jokers: [],
    blind: { kind: "small", name: "Small Blind", scoreTarget: 300, boss: null },
    ante: 1,
    round: 1,
    stake: "white",
    money: 4,
    remainingHands: 4,
    remainingDiscards: 3,
    roundScore: 0,
    deckId: "red-deck",
    deck: {
      total: 2,
      bySuit: { spades: 1, hearts: 0, diamonds: 0, clubs: 1 },
      byRank: {
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 0,
        "6": 0,
        "7": 0,
        "8": 0,
        "9": 0,
        "10": 0,
        J: 1,
        Q: 1,
        K: 0,
        A: 0,
      },
    },
  };
}

export function candidatesFixture(): ReadonlyArray<HandOption> {
  return [
    {
      action: "play",
      cardIds: [1, 2],
      handLabel: "Pair",
      score: 56,
      chips: 28,
      mult: 2,
      notes: [{ kind: "best-immediate-score" }],
    },
    {
      action: "discard",
      cardIds: [1],
      notes: [{ kind: "keeps-paired-ranks", ranks: ["9"] }],
    },
  ];
}

export function adviceRequestFixture(): HandAdviceRequest {
  return { state: modelStateFixture(), candidates: candidatesFixture() };
}

export function shopStateFixture(): ShopAdviceState {
  return {
    money: 12,
    ante: 2,
    jokers: [{ id: "blueprint", name: "Blueprint" }],
    jokerCapacity: 5,
    consumables: [{ id: "the-fool", name: "The Fool" }],
    consumableCapacity: 2,
    ownedVoucherIds: ["clearance-sale"],
  };
}

export function shopCandidatesFixture(): ReadonlyArray<ShopAdviceCandidate> {
  return [
    {
      action: "buy",
      item: {
        itemType: "joker",
        id: "jolly-joker",
        name: "Jolly Joker",
        description: "+8 Mult if played hand contains a Pair",
        cost: 3,
      },
    },
    { action: "reroll", cost: 5 },
    { action: "leave" },
  ];
}

export function shopAdviceRequestFixture(): ShopAdviceRequest {
  return {
    context: "shop",
    shop: shopStateFixture(),
    candidates: shopCandidatesFixture(),
  };
}

export function packStateFixture(): PackAdviceState {
  return {
    pool: "buffoon",
    variant: "normal",
    picksRemaining: 1,
    money: 8,
    ante: 3,
    jokers: [{ id: "blueprint", name: "Blueprint" }],
    jokerCapacity: 5,
    consumables: [],
    consumableCapacity: 2,
  };
}

export function packCandidatesFixture(): ReadonlyArray<PackAdviceCandidate> {
  return [
    {
      action: "pick",
      option: {
        optionType: "joker",
        id: "jolly-joker",
        name: "Jolly Joker",
        description: "+8 Mult if played hand contains a Pair",
      },
    },
    {
      action: "pick",
      option: {
        optionType: "joker",
        id: "supernova",
        name: "Supernova",
        description: "Adds the number of times this hand was played to Mult",
      },
    },
    { action: "skip" },
  ];
}

export function packAdviceRequestFixture(): PackAdviceRequest {
  return {
    context: "pack",
    pack: packStateFixture(),
    candidates: packCandidatesFixture(),
  };
}

export function blindStateFixture(): BlindAdviceState {
  return {
    kind: "small",
    ante: 2,
    scoreTarget: 800,
    payout: 3,
    money: 14,
    jokers: [{ id: "blueprint", name: "Blueprint" }],
    consumables: [],
    boss: {
      id: "the-wall",
      name: "The Wall",
      description: "Extra large blind",
      scoreTarget: 3200,
    },
    otherSkipOffer: {
      kind: "big",
      tag: {
        id: "investment",
        name: "Investment Tag",
        description: "After defeating the Boss Blind, gain $25.",
      },
    },
  };
}

export function blindCandidatesFixture(): ReadonlyArray<BlindAdviceCandidate> {
  return [
    { action: "play", scoreTarget: 800, payout: 3 },
    {
      action: "skip",
      tag: {
        id: "charm",
        name: "Charm Tag",
        description: "Gives a free Mega Arcana Pack.",
      },
    },
  ];
}

export function blindAdviceRequestFixture(): BlindAdviceRequest {
  return {
    context: "blind",
    blind: blindStateFixture(),
    candidates: blindCandidatesFixture(),
  };
}

export function postAdvice(body: unknown, ip = "203.0.113.7"): Request {
  return new Request("https://example.com/api/advice", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
