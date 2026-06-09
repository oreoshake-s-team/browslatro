// @vitest-environment node
import {
  createBlueprintJoker,
  createBrainstormJoker,
  createPlusFourMultJoker,
} from "../jokers";
import { resolveJokerEffect } from "./scoring/copy";

describe("resolveJokerEffect", () => {
  test("copy-right resolves to the effect of the joker on the right", () => {
    const resolved = resolveJokerEffect(
      [createBlueprintJoker(), createPlusFourMultJoker()],
      0,
    );
    expect(resolved.kind).toBe("additive-mult");
  });

  test("copy-leftmost resolves to the effect of the leftmost joker", () => {
    const resolved = resolveJokerEffect(
      [createPlusFourMultJoker(), createBrainstormJoker()],
      1,
    );
    expect(resolved.kind).toBe("additive-mult");
  });

  test("a non-copy joker resolves to its own effect by reference", () => {
    const joker = createPlusFourMultJoker();
    const resolved = resolveJokerEffect([joker], 0);
    expect(resolved).toBe(joker.effect);
  });

  test("chained Blueprints resolve through to the real joker", () => {
    const resolved = resolveJokerEffect(
      [createBlueprintJoker(), createBlueprintJoker(), createPlusFourMultJoker()],
      0,
    );
    expect(resolved.kind).toBe("additive-mult");
  });

  test("Brainstorm copying a Blueprint that copies right resolves to the real joker", () => {
    const resolved = resolveJokerEffect(
      [createBlueprintJoker(), createPlusFourMultJoker(), createBrainstormJoker()],
      2,
    );
    expect(resolved.kind).toBe("additive-mult");
  });

  test("copy-right at the rightmost slot resolves to noop", () => {
    const resolved = resolveJokerEffect(
      [createPlusFourMultJoker(), createBlueprintJoker()],
      1,
    );
    expect(resolved.kind).toBe("noop");
  });

  test("Brainstorm copying itself as the leftmost joker resolves to noop", () => {
    const resolved = resolveJokerEffect([createBrainstormJoker()], 0);
    expect(resolved.kind).toBe("noop");
  });

  test("a Blueprint/Brainstorm cycle resolves to noop", () => {
    const resolved = resolveJokerEffect(
      [createBlueprintJoker(), createBrainstormJoker()],
      0,
    );
    expect(resolved.kind).toBe("noop");
  });
});
