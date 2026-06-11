// @vitest-environment node
import {
  TURTLE_BEAN_HAND_SIZE,
  TURTLE_BEAN_LOSS_PER_ROUND,
  applyRoundEndToJokerStates,
  createJokerCatalog,
  createTurtleBeanJoker,
  extraStartingHandSizeFromJokers,
} from "../jokers";
import type { Joker } from "../jokers";

function afterRounds(joker: Joker, rounds: number): Joker[] {
  let jokers: Joker[] = [joker];
  for (let i = 0; i < rounds; i += 1) {
    jokers = applyRoundEndToJokerStates(jokers, () => 0.99);
  }
  return jokers;
}

describe("Turtle Bean", () => {
  test("is registered in the joker catalog", () => {
    const ids = createJokerCatalog().map((j) => j.id);
    expect(ids).toContain("turtle-bean");
  });

  test("grants its full hand-size bonus when fresh", () => {
    expect(extraStartingHandSizeFromJokers([createTurtleBeanJoker()])).toBe(
      TURTLE_BEAN_HAND_SIZE,
    );
  });

  test("the bonus shrinks each round", () => {
    const jokers = afterRounds(createTurtleBeanJoker(), 2);
    expect(extraStartingHandSizeFromJokers(jokers)).toBe(
      TURTLE_BEAN_HAND_SIZE - 2 * TURTLE_BEAN_LOSS_PER_ROUND,
    );
  });

  test("is destroyed when the bonus reaches 0", () => {
    const rounds = TURTLE_BEAN_HAND_SIZE / TURTLE_BEAN_LOSS_PER_ROUND;
    expect(afterRounds(createTurtleBeanJoker(), rounds)).toHaveLength(0);
  });

  test("survives the round before depletion (negative)", () => {
    const rounds = TURTLE_BEAN_HAND_SIZE / TURTLE_BEAN_LOSS_PER_ROUND - 1;
    expect(afterRounds(createTurtleBeanJoker(), rounds)).toHaveLength(1);
  });

  test("an eternal Turtle Bean is not destroyed at 0", () => {
    const eternal: Joker = {
      ...createTurtleBeanJoker(),
      stickers: [{ kind: "eternal" }],
    };
    const rounds = TURTLE_BEAN_HAND_SIZE / TURTLE_BEAN_LOSS_PER_ROUND;
    expect(afterRounds(eternal, rounds)).toHaveLength(1);
  });
});
