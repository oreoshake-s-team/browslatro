import i18n from "./index";
import { isHandLabel, tHandLabel } from "./handLabels";

describe("handLabels", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  test("isHandLabel accepts every catalog hand label", () => {
    expect(isHandLabel("Full House")).toBe(true);
  });

  test("isHandLabel rejects an unknown label (negative)", () => {
    expect(isHandLabel("Dead Man's Hand")).toBe(false);
  });

  test("tHandLabel returns the catalog string for a known label", () => {
    expect(tHandLabel(i18n.t, "Two Pair")).toBe("Two Pair");
  });

  test("tHandLabel falls back to the raw label for unknown input (negative)", () => {
    expect(tHandLabel(i18n.t, "Dead Man's Hand")).toBe("Dead Man's Hand");
  });

  test("tHandLabel resolves through the active locale", async () => {
    await i18n.changeLanguage("haw");
    expect(tHandLabel(i18n.t, "Flush")).toBe("Palaki");
  });
});
