import { describe, expect, test } from "vitest";
import {
  compareDisplayNames,
  sortByDisplayName,
  stripLeadingThe,
} from "./displayNameSort";

describe("stripLeadingThe", () => {
  test("strips a leading 'The ' prefix", () => {
    expect(stripLeadingThe("The Fool")).toBe("Fool");
  });

  test("strips the prefix case-insensitively", () => {
    expect(stripLeadingThe("THE Duo")).toBe("Duo");
  });

  test("does not strip a mid-name 'the' (negative)", () => {
    expect(stripLeadingThe("Hit the Road")).toBe("Hit the Road");
  });

  test("does not strip 'The' without a trailing space (negative)", () => {
    expect(stripLeadingThe("Theater")).toBe("Theater");
  });
});

describe("compareDisplayNames", () => {
  test("sorts 'The Fool' under F, after 'Death'", () => {
    expect(compareDisplayNames("The Fool", "Death")).toBeGreaterThan(0);
  });

  test("sorts 'The Duo' under D, before 'Judgement'", () => {
    expect(compareDisplayNames("The Duo", "Judgement")).toBeLessThan(0);
  });

  test("compares prefix-stripped names case-insensitively to the prefix", () => {
    expect(compareDisplayNames("the Idol", "The Idol")).toBe(0);
  });
});

describe("sortByDisplayName", () => {
  test("orders items alphabetically ignoring a leading 'The '", () => {
    const items = [
      { name: "The Trio" },
      { name: "Banner" },
      { name: "The Duo" },
    ];
    expect(sortByDisplayName(items, (i) => i.name).map((i) => i.name)).toEqual([
      "Banner",
      "The Duo",
      "The Trio",
    ]);
  });

  test("does not mutate the input array (negative)", () => {
    const items = [{ name: "The Trio" }, { name: "Banner" }];
    sortByDisplayName(items, (i) => i.name);
    expect(items.map((i) => i.name)).toEqual(["The Trio", "Banner"]);
  });
});
