// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest";
import { createTagCatalog, rollSkipTag } from "./tags";

describe("rollSkipTag with browslatro:forceSkipTagIds localStorage override", () => {
  afterEach(() => {
    window.localStorage.removeItem("browslatro:forceSkipTagIds");
  });

  test("respects a known tag id from the override", () => {
    window.localStorage.setItem("browslatro:forceSkipTagIds", "economy");
    expect(rollSkipTag(() => 0)).toBe("economy");
  });

  test("ignores an unknown id and falls back to the RNG (negative)", () => {
    const ids = createTagCatalog().map((t) => t.id);
    window.localStorage.setItem("browslatro:forceSkipTagIds", "not-a-real-tag");
    expect(ids).toContain(rollSkipTag(() => 0));
  });

  test("with no override set, returns a tag from the catalog", () => {
    const ids = createTagCatalog().map((t) => t.id);
    expect(ids).toContain(rollSkipTag(() => 0));
  });
});
