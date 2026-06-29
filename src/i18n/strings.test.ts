import i18n from "./index";
import { cardName, tSuitName } from "./strings";

describe("card identity strings", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  test("cardName composes rank and suit through the catalog", () => {
    expect(cardName(i18n.t, { rank: "A", suit: "spades" })).toBe(
      "A of Spades",
    );
  });

  test("tSuitName resolves every suit", () => {
    expect(
      (["spades", "hearts", "diamonds", "clubs"] as const).map((s) =>
        tSuitName(i18n.t, s),
      ),
    ).toEqual(["Spades", "Hearts", "Diamonds", "Clubs"]);
  });

  test("cardName localizes the suit under the haw locale", async () => {
    await i18n.changeLanguage("haw");
    expect(cardName(i18n.t, { rank: "10", suit: "hearts" })).toBe(
      "10 o ka Haka",
    );
  });
});
