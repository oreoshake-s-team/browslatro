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

  test(".card consumes var(--card-width)", () => {
    expect(blockBody(cardCss, ".card")).toMatch(
      /width:\s*var\(--card-width\)/,
    );
  });

  test(".card consumes var(--card-height)", () => {
    expect(blockBody(cardCss, ".card")).toMatch(
      /height:\s*var\(--card-height\)/,
    );
  });

  test(".deck-pile consumes var(--card-width)", () => {
    expect(blockBody(deckPileCss, ".deck-pile")).toMatch(
      /width:\s*var\(--card-width\)/,
    );
  });

  test(".deck-pile consumes var(--card-height)", () => {
    expect(blockBody(deckPileCss, ".deck-pile")).toMatch(
      /height:\s*var\(--card-height\)/,
    );
  });

  test(".discard-pile consumes var(--card-width)", () => {
    expect(blockBody(discardPileCss, ".discard-pile")).toMatch(
      /width:\s*var\(--card-width\)/,
    );
  });

  test(".discard-pile consumes var(--card-height)", () => {
    expect(blockBody(discardPileCss, ".discard-pile")).toMatch(
      /height:\s*var\(--card-height\)/,
    );
  });

  test(".joker-tile consumes var(--card-width)", () => {
    expect(blockBody(jokersCss, ".joker-tile")).toMatch(
      /width:\s*var\(--card-width\)/,
    );
  });

  test(".joker-tile consumes var(--card-height)", () => {
    expect(blockBody(jokersCss, ".joker-tile")).toMatch(
      /height:\s*var\(--card-height\)/,
    );
  });

  test(".consumable-tile consumes var(--card-width)", () => {
    expect(blockBody(consumablesCss, ".consumable-tile")).toMatch(
      /width:\s*var\(--card-width\)/,
    );
  });

  test(".consumable-tile consumes var(--card-height)", () => {
    expect(blockBody(consumablesCss, ".consumable-tile")).toMatch(
      /height:\s*var\(--card-height\)/,
    );
  });

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
