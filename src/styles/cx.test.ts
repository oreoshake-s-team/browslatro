import { cx } from "./cx";

describe("cx", () => {
  test("joins class strings with spaces", () => {
    expect(cx("a", "b c")).toBe("a b c");
  });

  test("drops false conditions", () => {
    expect(cx("a", false, "b")).toBe("a b");
  });

  test("drops undefined values", () => {
    expect(cx("a", undefined)).toBe("a");
  });

  test("negative: returns an empty string with no truthy parts", () => {
    expect(cx(false, undefined)).toBe("");
  });
});
