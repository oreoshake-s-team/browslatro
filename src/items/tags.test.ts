// @vitest-environment node
import {
  INVESTMENT_TAG_REWARD,
  createTagCatalog,
  getTagSpec,
  tagPayout,
  totalTagPayout,
} from "./tags";

describe("INVESTMENT_TAG_REWARD", () => {
  test("equals $25", () => {
    expect(INVESTMENT_TAG_REWARD).toBe(25);
  });
});

describe("Tag catalog", () => {
  test("includes the Investment tag", () => {
    const ids = createTagCatalog().map((t) => t.id);
    expect(ids).toContain("investment");
  });

  test("Investment tag has the canonical name and description", () => {
    const spec = getTagSpec("investment");
    expect(spec.name).toBe("Investment Tag");
    expect(spec.description).toContain("$25");
  });
});

describe("tagPayout", () => {
  test("Investment pays $25", () => {
    expect(tagPayout("investment")).toBe(25);
  });
});

describe("totalTagPayout", () => {
  test("empty list sums to 0", () => {
    expect(totalTagPayout([])).toBe(0);
  });

  test("single Investment sums to $25", () => {
    expect(totalTagPayout(["investment"])).toBe(25);
  });

  test("two Investments sum to $50", () => {
    expect(totalTagPayout(["investment", "investment"])).toBe(50);
  });
});
