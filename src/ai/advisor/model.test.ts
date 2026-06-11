// @vitest-environment node
import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, test } from "vitest";
import type { AdviceRequest } from "./types";
import { buildUserMessage, mapModelError, parseAdvice, type Advice } from "./model";
import {
  adviceRequestFixture,
  packAdviceRequestFixture,
  shopAdviceRequestFixture,
} from "./test-helpers";
import { ECONOMY_WIKI, JOKER_WIKI } from "./wiki";

function withBlueprintJoker(): AdviceRequest {
  const base = adviceRequestFixture();
  return {
    ...base,
    state: {
      ...base.state,
      jokers: [
        {
          id: "blueprint",
          name: "Blueprint",
          description: "Copies the ability of the Joker to the right",
          effectKind: "copy-right",
          rarity: "rare",
          edition: null,
          stickers: [],
          counter: null,
        },
      ],
    },
  };
}

function validAdvice(): Advice {
  return {
    recommendationIndex: 0,
    alternativeIndex: 1,
    whyAlternativeWorse: "Discarding wastes a strong pair.",
    explanation: "Play the pair of nines for the highest scored hand.",
    concept: "Bank guaranteed score before chasing draws.",
  };
}

describe("buildUserMessage", () => {
  test("annotates every candidate with its index", () => {
    const message = buildUserMessage(adviceRequestFixture());
    expect(message).toContain('"index":1');
  });

  test("includes the serialized game state", () => {
    const message = buildUserMessage(adviceRequestFixture());
    expect(message).toContain('"scoreTarget":300');
  });

  test("notes the left-to-right joker order when jokers are in play", () => {
    const message = buildUserMessage(withBlueprintJoker());
    expect(message).toContain("jokers trigger left to right");
  });

  test("omits the joker-order note when no jokers are in play", () => {
    const message = buildUserMessage(adviceRequestFixture());
    expect(message).not.toContain("jokers trigger left to right");
  });

  test("injects the wiki entry for an in-play joker", () => {
    const message = buildUserMessage(withBlueprintJoker());
    expect(message).toContain(`- Blueprint: ${JOKER_WIKI.blueprint}`);
  });

  test("omits the reference section when nothing is retrieved", () => {
    const message = buildUserMessage(adviceRequestFixture());
    expect(message).not.toContain("Reference notes:");
  });
});

describe("buildUserMessage pack context", () => {
  test("includes the serialized pack state", () => {
    const message = buildUserMessage(packAdviceRequestFixture());
    expect(message).toContain('"pool":"buffoon"');
  });

  test("annotates every pack candidate with its index", () => {
    const message = buildUserMessage(packAdviceRequestFixture());
    expect(message).toContain('"index":2');
  });

  test("labels the candidates as pack actions", () => {
    const message = buildUserMessage(packAdviceRequestFixture());
    expect(message).toContain("Candidate pack actions (choose by index):");
  });

  test("injects the wiki entry for an offered joker", () => {
    const message = buildUserMessage(packAdviceRequestFixture());
    expect(message).toContain(`- Supernova: ${JOKER_WIKI.supernova}`);
  });

  test("injects the wiki entry for a held joker", () => {
    const message = buildUserMessage(packAdviceRequestFixture());
    expect(message).toContain(`- Blueprint: ${JOKER_WIKI.blueprint}`);
  });

  test("omits the economy note", () => {
    const message = buildUserMessage(packAdviceRequestFixture());
    expect(message).not.toContain(ECONOMY_WIKI);
  });

  test("notes the pack is already paid for", () => {
    const message = buildUserMessage(packAdviceRequestFixture());
    expect(message).toContain("already paid for");
  });
});

describe("buildUserMessage shop context", () => {
  test("includes the serialized shop state", () => {
    const message = buildUserMessage(shopAdviceRequestFixture());
    expect(message).toContain('"jokerCapacity":5');
  });

  test("annotates every shop candidate with its index", () => {
    const message = buildUserMessage(shopAdviceRequestFixture());
    expect(message).toContain('"index":2');
  });

  test("labels the candidates as shop actions", () => {
    const message = buildUserMessage(shopAdviceRequestFixture());
    expect(message).toContain("Candidate shop actions (choose by index):");
  });

  test("injects the wiki entry for an offered joker", () => {
    const message = buildUserMessage(shopAdviceRequestFixture());
    expect(message).toContain(
      `- Jolly Joker: ${JOKER_WIKI["jolly-joker"]}`,
    );
  });

  test("injects the wiki entry for a held joker", () => {
    const message = buildUserMessage(shopAdviceRequestFixture());
    expect(message).toContain(`- Blueprint: ${JOKER_WIKI.blueprint}`);
  });

  test("always includes the economy note", () => {
    const message = buildUserMessage(shopAdviceRequestFixture());
    expect(message).toContain(`- Economy: ${ECONOMY_WIKI}`);
  });

  test("omits the joker-order note", () => {
    const message = buildUserMessage(shopAdviceRequestFixture());
    expect(message).not.toContain("jokers trigger left to right");
  });
});

describe("parseAdvice", () => {
  test("accepts a valid advice object", () => {
    expect(parseAdvice(JSON.stringify(validAdvice()), 2)).toEqual(validAdvice());
  });

  test("rejects non-JSON text", () => {
    expect(parseAdvice("not json", 2)).toBeNull();
  });

  test("rejects a JSON scalar", () => {
    expect(parseAdvice("42", 2)).toBeNull();
  });

  test("rejects a recommendation index outside the candidate range", () => {
    expect(
      parseAdvice(JSON.stringify({ ...validAdvice(), recommendationIndex: 2 }), 2),
    ).toBeNull();
  });

  test("rejects a negative alternative index", () => {
    expect(
      parseAdvice(JSON.stringify({ ...validAdvice(), alternativeIndex: -1 }), 2),
    ).toBeNull();
  });

  test("rejects an alternative equal to the recommendation", () => {
    expect(
      parseAdvice(JSON.stringify({ ...validAdvice(), alternativeIndex: 0 }), 2),
    ).toBeNull();
  });

  test("rejects a missing explanation", () => {
    const advice: Record<string, unknown> = { ...validAdvice() };
    delete advice.explanation;
    expect(parseAdvice(JSON.stringify(advice), 2)).toBeNull();
  });

  test("rejects a non-string concept", () => {
    expect(
      parseAdvice(JSON.stringify({ ...validAdvice(), concept: 7 }), 2),
    ).toBeNull();
  });
});

describe("mapModelError", () => {
  test("maps upstream rate limiting to advisor_busy", () => {
    const error = Object.create(Anthropic.RateLimitError.prototype) as Error;
    expect(mapModelError(error)).toEqual({
      ok: false,
      status: 503,
      code: "advisor_busy",
    });
  });

  test("maps a timeout to model_timeout", () => {
    const error = Object.create(
      Anthropic.APIConnectionTimeoutError.prototype,
    ) as Error;
    expect(mapModelError(error)).toEqual({
      ok: false,
      status: 504,
      code: "model_timeout",
    });
  });

  test("maps unknown failures to model_error", () => {
    expect(mapModelError(new Error("boom"))).toEqual({
      ok: false,
      status: 502,
      code: "model_error",
    });
  });
});
