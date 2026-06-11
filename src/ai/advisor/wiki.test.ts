// @vitest-environment node
import { describe, expect, test } from "vitest";
import type { ModelJoker, ModelState } from "../modelState";
import { createBossCatalog } from "../../items/bosses";
import {
  createJokerCatalog,
  createLegendaryJokerCatalog,
} from "../../items/jokers/catalog";
import { createStakeCatalog } from "../../items/stakes";
import { modelStateFixture } from "./test-helpers";
import {
  BOSS_WIKI,
  COMBO_WIKI,
  ECONOMY_WIKI,
  JOKER_WIKI,
  STAKE_WIKI,
  retrieveShopWikiEntries,
  retrieveWikiEntries,
} from "./wiki";

describe("retrieveShopWikiEntries", () => {
  test("returns a joker entry for a known joker", () => {
    const entries = retrieveShopWikiEntries([
      { id: "blueprint", name: "Blueprint" },
    ]);
    expect(entries).toContainEqual({
      key: "blueprint",
      kind: "joker",
      title: "Blueprint",
      text: JOKER_WIKI.blueprint,
    });
  });

  test("dedupes repeated joker ids", () => {
    const entries = retrieveShopWikiEntries([
      { id: "blueprint", name: "Blueprint" },
      { id: "blueprint", name: "Blueprint" },
    ]);
    expect(entries.filter((entry) => entry.key === "blueprint")).toHaveLength(1);
  });

  test("skips jokers without wiki entries", () => {
    const entries = retrieveShopWikiEntries([{ id: "nope", name: "Nope" }]);
    expect(entries.some((entry) => entry.kind === "joker")).toBe(false);
  });

  test("includes a combo entry when a participating joker is present", () => {
    const combo = COMBO_WIKI[0];
    const entries = retrieveShopWikiEntries([
      { id: combo.jokers[0], name: "Fixture" },
    ]);
    expect(entries.some((entry) => entry.key === combo.key)).toBe(true);
  });

  test("always appends the economy entry", () => {
    const entries = retrieveShopWikiEntries([]);
    expect(entries.at(-1)).toEqual({
      key: "economy",
      kind: "strategy",
      title: "Economy",
      text: ECONOMY_WIKI,
    });
  });
});

function jokerFixture(id: string, name: string): ModelJoker {
  return {
    id,
    name,
    description: "fixture",
    effectKind: "additive-mult",
    rarity: "common",
    edition: null,
    stickers: [],
    counter: null,
  };
}

function withJokers(jokers: ReadonlyArray<ModelJoker>): ModelState {
  return { ...modelStateFixture(), jokers };
}

function withBoss(id: string, name: string): ModelState {
  return {
    ...modelStateFixture(),
    blind: {
      kind: "boss",
      name,
      scoreTarget: 600,
      boss: { id, name, description: "fixture", effectKind: "none" },
    },
  };
}

describe("retrieveWikiEntries", () => {
  test("returns the entry for an in-play joker", () => {
    const entries = retrieveWikiEntries(
      withJokers([jokerFixture("blueprint", "Blueprint")]),
    );
    expect(entries.filter((entry) => entry.kind === "joker")).toEqual([
      {
        key: "blueprint",
        kind: "joker",
        title: "Blueprint",
        text: JOKER_WIKI.blueprint,
      },
    ]);
  });

  test("skips jokers without a wiki entry", () => {
    const entries = retrieveWikiEntries(
      withJokers([jokerFixture("plus-four-mult", "+4 Mult")]),
    );
    expect(entries).toEqual([]);
  });

  test("dedupes duplicate jokers", () => {
    const entries = retrieveWikiEntries(
      withJokers([
        jokerFixture("baron", "Baron"),
        jokerFixture("baron", "Baron"),
      ]),
    );
    expect(entries.filter((entry) => entry.kind === "joker")).toHaveLength(1);
  });

  test("returns the entry for the active boss blind", () => {
    const entries = retrieveWikiEntries(withBoss("the-needle", "The Needle"));
    expect(entries).toEqual([
      {
        key: "the-needle",
        kind: "boss",
        title: "The Needle",
        text: BOSS_WIKI["the-needle"],
      },
    ]);
  });

  test("returns no boss entry for a small blind", () => {
    expect(retrieveWikiEntries(modelStateFixture())).toEqual([]);
  });

  test("skips a boss without a wiki entry", () => {
    expect(retrieveWikiEntries(withBoss("the-unknown", "The Unknown"))).toEqual(
      [],
    );
  });

  test("returns a combo entry when a participating joker is in play", () => {
    const entries = retrieveWikiEntries(
      withJokers([jokerFixture("hologram", "Hologram")]),
    );
    expect(entries.filter((entry) => entry.kind === "combo")).toEqual([
      {
        key: "deck-duplication",
        kind: "combo",
        title: "Deck duplication",
        text: COMBO_WIKI.find((combo) => combo.key === "deck-duplication")?.text,
      },
    ]);
  });

  test("returns a combo entry once when several participants are in play", () => {
    const entries = retrieveWikiEntries(
      withJokers([
        jokerFixture("photograph", "Photograph"),
        jokerFixture("hanging-chad", "Hanging Chad"),
      ]),
    );
    expect(
      entries.filter((entry) => entry.key === "photochad"),
    ).toHaveLength(1);
  });

  test("returns no combo entry for a joker outside every combo", () => {
    const entries = retrieveWikiEntries(
      withJokers([jokerFixture("plus-four-mult", "+4 Mult")]),
    );
    expect(entries.filter((entry) => entry.kind === "combo")).toEqual([]);
  });

  test("returns the economy note at the first interest step", () => {
    const entries = retrieveWikiEntries({ ...modelStateFixture(), money: 5 });
    expect(entries).toEqual([
      { key: "economy", kind: "strategy", title: "Economy", text: ECONOMY_WIKI },
    ]);
  });

  test("returns no economy note below the first interest step", () => {
    const entries = retrieveWikiEntries({ ...modelStateFixture(), money: 4 });
    expect(entries.filter((entry) => entry.kind === "strategy")).toEqual([]);
  });

  test("returns the stake entry for a non-white stake", () => {
    const entries = retrieveWikiEntries({ ...modelStateFixture(), stake: "gold" });
    expect(entries.filter((entry) => entry.kind === "stake")).toEqual([
      { key: "gold", kind: "stake", title: "Gold Stake", text: STAKE_WIKI.gold },
    ]);
  });

  test("returns no stake entry on white stake", () => {
    const entries = retrieveWikiEntries(modelStateFixture());
    expect(entries.filter((entry) => entry.kind === "stake")).toEqual([]);
  });
});

describe("wiki content keys", () => {
  test("every contains-a-hand joker has a generated entry", () => {
    const family = [
      "jolly-joker",
      "zany-joker",
      "mad-joker",
      "crazy-joker",
      "droll-joker",
      "sly-joker",
      "wily-joker",
      "clever-joker",
      "devious-joker",
      "crafty-joker",
    ];
    expect(family.filter((id) => JOKER_WIKI[id] === undefined)).toEqual([]);
  });

  test("the generated entries explain the contains-a-hand mechanic", () => {
    expect(JOKER_WIKI["sly-joker"]).toContain(
      "Triggers whenever the played hand contains a Pair",
    );
  });

  test("every joker wiki key exists in the joker catalog", () => {
    const known = new Set(
      [...createJokerCatalog(), ...createLegendaryJokerCatalog()].map(
        (joker) => joker.id,
      ),
    );
    expect(Object.keys(JOKER_WIKI).filter((key) => !known.has(key))).toEqual([]);
  });

  test("every boss wiki key exists in the boss catalog", () => {
    const known = new Set(createBossCatalog().map((boss) => boss.id));
    expect(Object.keys(BOSS_WIKI).filter((key) => !known.has(key))).toEqual([]);
  });

  test("every boss in the catalog has a wiki entry", () => {
    const missing = createBossCatalog()
      .map((boss) => boss.id)
      .filter((id) => BOSS_WIKI[id] === undefined);
    expect(missing).toEqual([]);
  });

  test("every combo wiki joker id exists in the joker catalog", () => {
    const known = new Set(
      [...createJokerCatalog(), ...createLegendaryJokerCatalog()].map(
        (joker) => joker.id,
      ),
    );
    const unknown = COMBO_WIKI.flatMap((combo) =>
      combo.jokers.filter((id) => !known.has(id)),
    );
    expect(unknown).toEqual([]);
  });

  test("combo wiki keys are unique", () => {
    const keys = COMBO_WIKI.map((combo) => combo.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("every stake wiki key exists in the stake catalog", () => {
    const known = new Set<string>(createStakeCatalog().map((stake) => stake.id));
    expect(Object.keys(STAKE_WIKI).filter((key) => !known.has(key))).toEqual([]);
  });
});
