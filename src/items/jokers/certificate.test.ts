// @vitest-environment node
import {
  createBlueprintJoker,
  createBrainstormJoker,
  createCertificateJoker,
  createJokerCatalog,
  sealedCardsOnRoundBeginFromJokers,
} from "../jokers";

describe("Certificate", () => {
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

  test("Blueprint copying Certificate adds a second sealed card on round begin", () => {
    expect(
      sealedCardsOnRoundBeginFromJokers([createBlueprintJoker(), createCertificateJoker()]),
    ).toBe(2);
  });

  test("Brainstorm copying Certificate adds a second sealed card on round begin", () => {
    expect(
      sealedCardsOnRoundBeginFromJokers([createCertificateJoker(), createBrainstormJoker()]),
    ).toBe(2);
  });

  test("Blueprint with no right neighbor contributes nothing (negative)", () => {
    expect(
      sealedCardsOnRoundBeginFromJokers([createCertificateJoker(), createBlueprintJoker()]),
    ).toBe(1);
  });
});
