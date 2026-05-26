// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from "fs";
import { join } from "path";

const indexCss = readFileSync(join(__dirname, "index.css"), "utf8");
const cardCss = readFileSync(
  join(__dirname, "components", "cards", "Card.css"),
  "utf8",
);
const deckPileCss = readFileSync(
  join(__dirname, "components", "cards", "DeckPile.css"),
  "utf8",
);
const discardPileCss = readFileSync(
  join(__dirname, "components", "cards", "DiscardPile.css"),
  "utf8",
);
const jokersCss = readFileSync(
  join(__dirname, "components", "jokers", "Jokers.css"),
  "utf8",
);
const consumablesCss = readFileSync(
  join(__dirname, "components", "consumables", "Consumables.css"),
  "utf8",
);

function blockBody(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = source.match(new RegExp(`${escaped}\\s*{([^}]*)}`));
  if (!match) throw new Error(`${selector} rule not found`);
  return match[1];
}

describe("Card-size design tokens (issue #214)", () => {
  test("--card-width is defined on :root", () => {
    expect(blockBody(indexCss, ":root")).toMatch(/--card-width:\s*[\d.]+rem/);
  });

  test("--card-height is defined on :root", () => {
    expect(blockBody(indexCss, ":root")).toMatch(/--card-height:\s*[\d.]+rem/);
  });

  test("--card-width and --card-height are in a 5:7 ratio", () => {
    const root = blockBody(indexCss, ":root");
    const w = Number(/--card-width:\s*([\d.]+)rem/.exec(root)?.[1]);
    const h = Number(/--card-height:\s*([\d.]+)rem/.exec(root)?.[1]);
    expect(h / w).toBeCloseTo(7 / 5, 5);
  });

  const cardShapedMatrix: ReadonlyArray<{
    source: string;
    selector: string;
    dimension: "width" | "height";
  }> = [
    { source: cardCss, selector: ".card", dimension: "width" },
    { source: cardCss, selector: ".card", dimension: "height" },
    { source: deckPileCss, selector: ".deck-pile", dimension: "width" },
    { source: deckPileCss, selector: ".deck-pile", dimension: "height" },
    { source: discardPileCss, selector: ".discard-pile", dimension: "width" },
    { source: discardPileCss, selector: ".discard-pile", dimension: "height" },
    { source: jokersCss, selector: ".joker-tile", dimension: "width" },
    { source: jokersCss, selector: ".joker-tile", dimension: "height" },
    { source: consumablesCss, selector: ".consumable-tile", dimension: "width" },
    { source: consumablesCss, selector: ".consumable-tile", dimension: "height" },
  ];

  test.each(cardShapedMatrix)(
    "$selector consumes var(--card-$dimension)",
    ({ source, selector, dimension }) => {
      expect(blockBody(source, selector)).toMatch(
        new RegExp(`${dimension}:\\s*var\\(--card-${dimension}\\)`),
      );
    },
  );

  test("no card-shaped element still hard-codes the prior 4.5rem width", () => {
    const all = [
      cardCss,
      deckPileCss,
      discardPileCss,
      jokersCss,
      consumablesCss,
    ].join("\n");
    expect(all).not.toMatch(/\b4\.5rem\b/);
  });

  test("no card-shaped element still hard-codes the prior 9.5rem height", () => {
    const all = [
      cardCss,
      deckPileCss,
      discardPileCss,
      jokersCss,
      consumablesCss,
    ].join("\n");
    expect(all).not.toMatch(/\b9\.5rem\b/);
  });
});
