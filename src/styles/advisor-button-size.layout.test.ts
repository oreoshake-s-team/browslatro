// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from "fs";
import { join } from "path";

const componentsDir = join(__dirname, "..", "components");

function readCss(...segments: string[]): string {
  return readFileSync(join(componentsDir, ...segments), "utf8");
}

function ruleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(^|\\n)${escaped}\\s*{([^}]*)}`));
  if (!match) throw new Error(`Rule '${selector}' not found`);
  return match[2];
}

function declaration(body: string, property: string): string | null {
  const match = body.match(new RegExp(`${property}\\s*:\\s*([^;]+);`));
  return match ? match[1].trim() : null;
}

const blindSuggestCss = readCss("game", "BlindSuggestion.css");
const blindScreenCss = readCss("game", "BlindSelectScreen.css");
const shopSuggestCss = readCss("shop", "ShopSuggestion.css");
const shopCss = readCss("shop", "Shop.css");
const packSuggestCss = readCss("shop", "PackSuggestion.css");
const packModalCss = readCss("shop", "PackOpenModal.css");

describe("advisor suggest button sizing matches sibling actions", () => {
  test("blind suggest padding matches the Skip button", () => {
    expect(declaration(ruleBody(blindSuggestCss, ".blind-suggest-button"), "padding")).toBe(
      declaration(ruleBody(blindScreenCss, ".blind-select-skip"), "padding"),
    );
  });

  test("blind suggest font-size matches the Skip button", () => {
    expect(declaration(ruleBody(blindSuggestCss, ".blind-suggest-button"), "font-size")).toBe(
      declaration(ruleBody(blindScreenCss, ".blind-select-skip"), "font-size"),
    );
  });

  test("shop suggest padding matches the reroll button", () => {
    expect(declaration(ruleBody(shopSuggestCss, ".shop-suggest-button"), "padding")).toBe(
      declaration(ruleBody(shopCss, ".shop-reroll"), "padding"),
    );
  });

  test("shop suggest font-size matches the reroll button", () => {
    expect(declaration(ruleBody(shopSuggestCss, ".shop-suggest-button"), "font-size")).toBe(
      declaration(ruleBody(shopCss, ".shop-reroll"), "font-size"),
    );
  });

  test("pack suggest padding matches the close button", () => {
    expect(declaration(ruleBody(packSuggestCss, ".pack-suggest-button"), "padding")).toBe(
      declaration(ruleBody(packModalCss, ".pack-open-close"), "padding"),
    );
  });

  test("negative: blind suggest no longer relies on the base .btn padding", () => {
    expect(declaration(ruleBody(blindSuggestCss, ".blind-suggest-button"), "padding")).not.toBe(
      "0.5rem 1rem",
    );
  });
});
