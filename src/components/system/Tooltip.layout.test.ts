// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from "fs";
import { join } from "path";

const tooltipCss = readFileSync(join(__dirname, "Tooltip.css"), "utf8");
const indexTsx = readFileSync(join(__dirname, "..", "..", "index.tsx"), "utf8");

const componentSrc = (...segments: string[]): string =>
  readFileSync(join(__dirname, "..", ...segments), "utf8");

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tooltipCss.match(new RegExp(`(^|\\n)${escaped}\\s*{([^}]*)}`));
  if (!match) throw new Error(`Rule '${selector}' not found in Tooltip.css`);
  return match[2];
}

const GAME_PIECE_TOOLTIPS: Array<[string, string]> = [
  ["jokers", "JokerTooltip"],
  ["game", "TarotTooltip"],
  ["game", "TagTooltip"],
  ["game", "DeckTooltip"],
  ["game", "PlanetTooltip"],
  ["game", "SpectralTooltip"],
];

const ALL_TOOLTIPS: Array<[string, string, string]> = [
  ["cards", "CardTooltip", "card-tooltip"],
  ["jokers", "JokerTooltip", "joker-tooltip"],
  ["game", "TarotTooltip", "tarot-tooltip"],
  ["game", "TagTooltip", "tag-tooltip"],
  ["game", "DeckTooltip", "deck-tooltip"],
  ["game", "PlanetTooltip", "planet-tooltip"],
  ["game", "SpectralTooltip", "spectral-tooltip"],
];

describe("shared tooltip base", () => {
  test("Tooltip.css is imported in the app entry point", () => {
    expect(indexTsx).toContain('import "./components/system/Tooltip.css"');
  });

  test("the base sets the canonical max-width", () => {
    expect(ruleBody(".tooltip")).toMatch(/max-width\s*:\s*20rem/);
  });

  test("the base owns the shared chrome", () => {
    expect(ruleBody(".tooltip")).toMatch(/pointer-events\s*:\s*none/);
  });

  test("CardTooltip keeps its tighter max-width as an order-independent override", () => {
    expect(componentSrc("cards", "CardTooltip.css")).toMatch(
      /\.tooltip\.card-tooltip\s*{[^}]*max-width\s*:\s*17rem/,
    );
  });

  test.each(ALL_TOOLTIPS)(
    "%s/%s applies the shared tooltip class",
    (dir, name) => {
      expect(componentSrc(dir, `${name}.tsx`)).toMatch(
        /className="tooltip [a-z-]+-tooltip"/,
      );
    },
  );

  test.each(GAME_PIECE_TOOLTIPS)(
    "negative: %s/%s no longer re-declares the tooltip chrome",
    (dir, name) => {
      expect(componentSrc(dir, `${name}.css`)).not.toMatch(/position\s*:\s*fixed/);
    },
  );
});
