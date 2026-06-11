// @vitest-environment node
/// <reference types="node" />
import { readdirSync, readFileSync } from "fs";
import { join, relative } from "path";

const SRC = join(__dirname, "..");
const indexCss = readFileSync(join(SRC, "index.css"), "utf8");
const tokensCss = readFileSync(join(__dirname, "tokens.css"), "utf8");
const cardCss = readFileSync(
  join(SRC, "components", "cards", "Card.css"),
  "utf8",
);

function collectCssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return collectCssFiles(full);
    return entry.name.endsWith(".css") ? [full] : [];
  });
}

describe("reduced motion coverage", () => {
  test("index.css zeroes --animation-speed under prefers-reduced-motion", () => {
    expect(indexCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*:root \{\s*--animation-speed: 0;/,
    );
  });

  test("negative: the base :root block does not set --animation-speed", () => {
    const baseRootBlock = indexCss.slice(0, indexCss.indexOf("}"));
    expect(baseRootBlock).not.toContain("--animation-speed");
  });

  test("negative: App.css does not shadow the inherited --animation-speed", () => {
    const appCss = readFileSync(join(SRC, "App.css"), "utf8");
    expect(appCss).not.toContain("--animation-speed:");
  });

  test("every timed transition scales with the --animation-speed token", () => {
    const offenders = collectCssFiles(SRC).flatMap((file) => {
      const css = readFileSync(file, "utf8");
      const declarations = css.match(/transition:[^;]+;/g) ?? [];
      return declarations
        .filter((declaration) => /\d+(\.\d+)?m?s\b/.test(declaration))
        .filter(
          (declaration) => !declaration.includes("var(--animation-speed"),
        )
        .map(
          (declaration) =>
            `${relative(SRC, file)}: ${declaration.replace(/\s+/g, " ")}`,
        );
    });
    expect(offenders).toEqual([]);
  });
});

describe("forced colors", () => {
  test("index.css maps --focus-ring to Highlight when forced-colors is active", () => {
    expect(indexCss).toMatch(
      /@media \(forced-colors: active\) \{\s*:root \{\s*--focus-ring: Highlight;/,
    );
  });

  test("Card.css opts cards out of forced color adjustment", () => {
    expect(cardCss).toMatch(
      /@media \(forced-colors: active\) \{\s*\.card \{\s*forced-color-adjust: none;/,
    );
  });

  test("Card.css gives selected cards a CanvasText outline under forced colors", () => {
    const forcedColorsBlock = cardCss.slice(
      cardCss.indexOf("@media (forced-colors: active)"),
    );
    expect(forcedColorsBlock).toMatch(
      /\.card-selected \{[^}]*outline: 2px solid CanvasText;/,
    );
  });

  test("Card.css gives focused cards a Highlight outline under forced colors", () => {
    const forcedColorsBlock = cardCss.slice(
      cardCss.indexOf("@media (forced-colors: active)"),
    );
    expect(forcedColorsBlock).toMatch(
      /\.card:focus-visible \{[^}]*outline: 2px solid Highlight;/,
    );
  });

  test("negative: the default focus ring color is unchanged outside forced colors", () => {
    expect(tokensCss).toMatch(/--focus-ring: #74c0fc;/);
  });
});
