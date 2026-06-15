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

  test("negative: blind suggest no longer relies on the base .btn padding", () => {
    expect(declaration(ruleBody(blindSuggestCss, ".blind-suggest-button"), "padding")).not.toBe(
      "0.5rem 1rem",
    );
  });
});
