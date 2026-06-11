// @vitest-environment node
import { describe, expect, test } from "vitest";
import type { ModelJoker, ModelState } from "../modelState";
import { createBossCatalog } from "../../items/bosses";
import {
  createJokerCatalog,
  createLegendaryJokerCatalog,
} from "../../items/jokers/catalog";
import { modelStateFixture } from "./test-helpers";
import { BOSS_WIKI, JOKER_WIKI, retrieveWikiEntries } from "./wiki";

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
    expect(entries).toEqual([
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
    expect(entries).toHaveLength(1);
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
});

describe("wiki content keys", () => {
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
});
