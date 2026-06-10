// @vitest-environment node
import {
  createCertificateJoker,
  createJokerCatalog,
  sealedCardsOnRoundBeginFromJokers,
} from "../jokers";

describe("Certificate (#988)", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("certificate");
  });

  test("adds one sealed card per round begin", () => {
    expect(
      sealedCardsOnRoundBeginFromJokers([createCertificateJoker()]),
    ).toBe(1);
  });

  test("two Certificates add two sealed cards", () => {
    expect(
      sealedCardsOnRoundBeginFromJokers([
        createCertificateJoker(),
        createCertificateJoker(),
      ]),
    ).toBe(2);
  });

  test("no Certificate adds nothing (negative)", () => {
    expect(
      sealedCardsOnRoundBeginFromJokers([createJokerCatalog()[0]]),
    ).toBe(0);
  });
});
