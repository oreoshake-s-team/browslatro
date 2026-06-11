// @vitest-environment node
import { describe, expect, test } from "vitest";
import { createBossCatalog } from "../../items/bosses";
import { createPlusFourMultJoker } from "../../items/jokers/factories";
import { describeSkipOffer, getTagSpec } from "../../items/tags";
import { requiredChipsForBlind } from "../../scoring/anteScaling";
import {
  buildBlindAdvicePlan,
  type BlindAdviceInput,
} from "./blindAdvicePlan";
import { parseAdviceRequest } from "./types";

function inputFixture(overrides: Partial<BlindAdviceInput> = {}): BlindAdviceInput {
  return {
    ante: 2,
    currentBlind: 1,
    boss: createBossCatalog()[0],
    stake: "white",
    skipRewards: {
      small: { id: "charm" },
      big: { id: "investment" },
    },
    money: 14,
    jokers: [],
    consumables: [],
    ...overrides,
  };
}

describe("buildBlindAdvicePlan", () => {
  test("returns null for the boss blind", () => {
    expect(buildBlindAdvicePlan(inputFixture({ currentBlind: 3 }))).toBeNull();
  });

  test("returns null when no skip offer exists for the current blind", () => {
    expect(
      buildBlindAdvicePlan(inputFixture({ skipRewards: undefined })),
    ).toBeNull();
  });

  test("offers exactly play then skip actions", () => {
    const plan = buildBlindAdvicePlan(inputFixture());
    expect(plan?.actions).toEqual([{ kind: "play" }, { kind: "skip" }]);
  });

  test("the play candidate carries the blind's score target and payout", () => {
    const input = inputFixture();
    const plan = buildBlindAdvicePlan(input);
    expect(plan?.request.candidates[0]).toEqual({
      action: "play",
      scoreTarget: requiredChipsForBlind({
        ante: input.ante,
        blind: 1,
        boss: input.boss,
        stake: input.stake,
      }),
      payout: 3,
    });
  });

  test("the skip candidate carries the offered tag spec", () => {
    const plan = buildBlindAdvicePlan(inputFixture());
    expect(plan?.request.candidates[1]).toEqual({
      action: "skip",
      tag: {
        id: "charm",
        name: getTagSpec("charm").name,
        description: getTagSpec("charm").description,
      },
    });
  });

  test("an orbital offer describes its rolled hand", () => {
    const offer = { id: "orbital", orbitalHand: "Pair" } as const;
    const plan = buildBlindAdvicePlan(
      inputFixture({ skipRewards: { small: offer } }),
    );
    const skip = plan?.request.candidates[1];
    if (skip?.action !== "skip") throw new Error("expected a skip candidate");
    expect(skip.tag.description).toBe(describeSkipOffer(offer).description);
  });

  test("the small blind pays nothing on red stake", () => {
    const plan = buildBlindAdvicePlan(inputFixture({ stake: "red" }));
    expect(plan?.request.blind.payout).toBe(0);
  });

  test("includes the big blind's offer for planning while deciding the small blind", () => {
    const plan = buildBlindAdvicePlan(inputFixture());
    expect(plan?.request.blind.otherSkipOffer).toEqual({
      kind: "big",
      tag: {
        id: "investment",
        name: getTagSpec("investment").name,
        description: getTagSpec("investment").description,
      },
    });
  });

  test("omits the other offer while deciding the big blind", () => {
    const plan = buildBlindAdvicePlan(inputFixture({ currentBlind: 2 }));
    expect(plan?.request.blind.otherSkipOffer).toBeNull();
  });

  test("the big blind decision uses the big skip offer", () => {
    const plan = buildBlindAdvicePlan(inputFixture({ currentBlind: 2 }));
    const skip = plan?.request.candidates[1];
    if (skip?.action !== "skip") throw new Error("expected a skip candidate");
    expect(skip.tag.id).toBe("investment");
  });

  test("carries the upcoming boss with its score target", () => {
    const input = inputFixture();
    const plan = buildBlindAdvicePlan(input);
    expect(plan?.request.blind.boss).toEqual({
      id: input.boss.id,
      name: input.boss.name,
      description: input.boss.description,
      scoreTarget: requiredChipsForBlind({
        ante: input.ante,
        blind: 3,
        boss: input.boss,
        stake: input.stake,
      }),
    });
  });

  test("carries held jokers as refs", () => {
    const joker = createPlusFourMultJoker();
    const plan = buildBlindAdvicePlan(inputFixture({ jokers: [joker] }));
    expect(plan?.request.blind.jokers).toEqual([
      { id: joker.id, name: joker.name },
    ]);
  });

  test("produces a request the server-side parser accepts", () => {
    const plan = buildBlindAdvicePlan(inputFixture());
    expect(plan && parseAdviceRequest(plan.request)).not.toBeNull();
  });
});
