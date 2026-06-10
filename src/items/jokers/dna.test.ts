// @vitest-environment node
import {
  createDnaJoker,
  createJokerCatalog,
  firstHandCardCopyCount,
} from "../jokers";

describe("DNA (#1039)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("dna");
  });

  test("copies the card on a single-card first hand", () => {
    expect(firstHandCardCopyCount([createDnaJoker()], 1, true)).toBe(1);
  });

  test("two DNA jokers each produce a copy", () => {
    expect(
      firstHandCardCopyCount([createDnaJoker(), createDnaJoker()], 1, true),
    ).toBe(2);
  });

  test("a multi-card first hand copies nothing (negative)", () => {
    expect(firstHandCardCopyCount([createDnaJoker()], 2, true)).toBe(0);
  });

  test("a later hand copies nothing (negative)", () => {
    expect(firstHandCardCopyCount([createDnaJoker()], 1, false)).toBe(0);
  });

  test("without DNA nothing is copied (negative)", () => {
    expect(
      firstHandCardCopyCount(createJokerCatalog().slice(0, 1), 1, true),
    ).toBe(0);
  });
});
