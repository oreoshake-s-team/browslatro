export interface JsonRecord {
  [key: string]: unknown;
}

export function validAdviceBody(): JsonRecord {
  return {
    state: {
      hand: [
        {
          id: 1,
          faceDown: false,
          rank: "A",
          suit: "spades",
          enhancement: null,
          seal: null,
          edition: null,
          bonusChips: 0,
        },
        {
          id: 2,
          faceDown: false,
          rank: "A",
          suit: "hearts",
          enhancement: null,
          seal: null,
          edition: null,
          bonusChips: 0,
        },
      ],
      jokers: [
        {
          id: "joker",
          name: "Joker",
          description: "+4 Mult",
          effectKind: "flat-mult",
          rarity: "common",
          edition: null,
          stickers: [],
          counter: null,
        },
      ],
      blind: { kind: "small", name: "Small Blind", scoreTarget: 300, boss: null },
      ante: 1,
      round: 1,
      money: 4,
      remainingHands: 4,
      remainingDiscards: 3,
      roundScore: 0,
      deck: { total: 50, bySuit: {}, byRank: {} },
    },
    options: [
      {
        action: "play",
        cardIds: [1, 2],
        handLabel: "Pair",
        score: 44,
        chips: 22,
        mult: 2,
        notes: [{ kind: "best-immediate-score" }],
      },
      {
        action: "discard",
        cardIds: [2],
        notes: [{ kind: "keeps-paired-ranks", ranks: ["A"] }],
      },
    ],
  };
}

export function adviceRequest(
  body: unknown,
  headers: Record<string, string> = {},
): Request {
  return new Request("https://example.test/api/advice", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
