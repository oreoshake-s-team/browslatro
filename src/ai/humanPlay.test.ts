// @vitest-environment node
import { describe, expect, test } from "vitest";
import { DATASET_SCHEMA_VERSION } from "./dataset";
import { getHandOptions } from "./getHandOptions";
import { recordHumanDecision, type HumanDecisionInput } from "./humanPlay";
import { card, simulateInput } from "./test-helpers";
import type { Card } from "../cards/types";
import type { SimulatePlayInput } from "./simulatePlay";

function input(
  hand: ReadonlyArray<Card>,
  extra?: Partial<HumanDecisionInput>,
): HumanDecisionInput {
  const base: SimulatePlayInput = simulateInput(hand);
  return {
    ...base,
    ante: 1,
    round: 1,
    selectedStake: "white",
    selectedDeck: "red-deck",
    roundScore: 0,
    ...extra,
  };
}

const pairHand = [
  card("9", "hearts"),
  card("9", "spades"),
  card("A", "clubs"),
  card("4", "diamonds"),
  card("7", "clubs"),
];

describe("recordHumanDecision — candidate alignment", () => {
  test("reuses the engine candidate when the player picks an offered play", () => {
    const state = input(pairHand);
    const best = getHandOptions(state, 3)[0];
    const record = recordHumanDecision(
      state,
      { kind: "play", cardIds: best.cardIds },
      7,
    );
    expect(record?.candidates[record.chosenIndex]).toEqual(best);
  });

  test("appends an off-menu play as an extra scored candidate", () => {
    const state = input(pairHand);
    const offMenu = [pairHand[2].id, pairHand[3].id];
    const record = recordHumanDecision(state, { kind: "play", cardIds: offMenu }, 7);
    expect(record?.candidates[record.chosenIndex]).toMatchObject({
      action: "play",
      cardIds: offMenu,
      handLabel: "High Card",
    });
  });

  test("the appended candidate carries the simulated score", () => {
    const state = input(pairHand);
    const ace = [pairHand[2].id];
    const record = recordHumanDecision(state, { kind: "play", cardIds: ace }, 7);
    const chosen = record?.candidates[record.chosenIndex];
    expect(chosen?.action === "play" && chosen.score).toBe(16);
  });

  test("appends an off-menu discard as an extra candidate", () => {
    const state = input(pairHand);
    const record = recordHumanDecision(
      state,
      { kind: "discard", cardIds: [pairHand[0].id, pairHand[2].id] },
      7,
    );
    expect(record?.candidates[record.chosenIndex]).toEqual({
      action: "discard",
      cardIds: [pairHand[0].id, pairHand[2].id],
      notes: [],
    });
  });
});

describe("recordHumanDecision — record shape", () => {
  test("stamps schema version, session seed, ante, and blind", () => {
    const state = input(pairHand, { ante: 3, blind: 2 });
    const record = recordHumanDecision(
      state,
      { kind: "play", cardIds: [pairHand[0].id, pairHand[1].id] },
      42,
    );
    expect(record).toMatchObject({
      schemaVersion: DATASET_SCHEMA_VERSION,
      runSeed: 42,
      ante: 3,
      blind: 2,
    });
  });

  test("round-trips through JSON without loss", () => {
    const record = recordHumanDecision(
      input(pairHand),
      { kind: "play", cardIds: [pairHand[0].id, pairHand[1].id] },
      1,
    );
    expect(JSON.parse(JSON.stringify(record))).toEqual(record);
  });
});

describe("recordHumanDecision — rejection", () => {
  test("returns null for a play of cards not in hand", () => {
    expect(
      recordHumanDecision(input(pairHand), { kind: "play", cardIds: [99999] }, 1),
    ).toBeNull();
  });

  test("returns null for an empty play", () => {
    expect(
      recordHumanDecision(input(pairHand), { kind: "play", cardIds: [] }, 1),
    ).toBeNull();
  });

  test("returns null for a discard with none remaining", () => {
    const state = input(pairHand, { remainingDiscards: 0 });
    expect(
      recordHumanDecision(state, { kind: "discard", cardIds: [pairHand[0].id] }, 1),
    ).toBeNull();
  });

  test("returns null for a discard of cards not in hand", () => {
    expect(
      recordHumanDecision(input(pairHand), { kind: "discard", cardIds: [99999] }, 1),
    ).toBeNull();
  });

  test("returns null for an oversized discard", () => {
    const wide = [
      ...pairHand,
      card("2", "spades"),
    ];
    const state = input(wide);
    expect(
      recordHumanDecision(
        state,
        { kind: "discard", cardIds: wide.map((c) => c.id) },
        1,
      ),
    ).toBeNull();
  });
});
