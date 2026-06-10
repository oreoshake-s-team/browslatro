// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from "fs";
import { join } from "path";

const shopCss = readFileSync(join(__dirname, "Shop.css"), "utf8");

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = shopCss.match(new RegExp(`(^|\\n)${escaped}\\s*{([^}]*)}`));
  if (!match) throw new Error(`Rule '${selector}' not found in Shop.css`);
  return match[2];
}

describe("shop offer tiles (issue #876)", () => {
  test("offers lay out as a grid of tiles", () => {
    expect(ruleBody(".shop-offers")).toMatch(/display\s*:\s*grid/);
  });

  test("the offers grid auto-fills tile-width columns", () => {
    expect(ruleBody(".shop-offers")).toMatch(
      /grid-template-columns\s*:\s*repeat\(auto-fill/,
    );
  });

  test("each offer stacks its content vertically", () => {
    expect(ruleBody(".shop-offer")).toMatch(/flex-direction\s*:\s*column/);
  });

  test("offers no longer use the billing-row grid placement", () => {
    expect(shopCss).not.toMatch(/\.shop-offer\s*{[^}]*grid-template-columns/);
  });

  test("offers no longer use the colored left-edge stripe", () => {
    expect(shopCss).not.toMatch(/border-left/);
  });

  test("the price renders as a gold money badge", () => {
    expect(ruleBody(".shop-offer-price")).toMatch(
      /background-color\s*:\s*var\(--accent-money\)/,
    );
  });

  test("the price badge is pill shaped", () => {
    expect(ruleBody(".shop-offer-price")).toMatch(/border-radius\s*:\s*999px/);
  });

  test("the buy button fills the tile width", () => {
    expect(ruleBody(".shop-offer-buy")).toMatch(/width\s*:\s*100%/);
  });

  test("the reroll button is not stretched to the offer-row height", () => {
    expect(shopCss).not.toMatch(/\.shop-reroll\s*{[^}]*align-self\s*:\s*stretch/);
  });

  test("the reroll button carries no custom color overrides", () => {
    expect(ruleBody(".shop-reroll")).not.toMatch(/color\s*:/);
  });
});
