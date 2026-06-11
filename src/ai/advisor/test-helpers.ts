import type { HandOption } from "../getHandOptions";
import type { ModelState } from "../modelState";
import type {
  HandAdviceRequest,
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

export function postAdvice(body: unknown, ip = "203.0.113.7"): Request {
  return new Request("https://example.com/api/advice", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
