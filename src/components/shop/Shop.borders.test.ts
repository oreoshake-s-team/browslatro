// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from "fs";
import { join } from "path";

const shopCss = readFileSync(join(__dirname, "Shop.css"), "utf8");

function topLevelRuleBody(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const opener = source.match(new RegExp(`(^|\\n)\\s*${escaped}\\s*{`));
  if (!opener) throw new Error(`Rule '${selector}' not found`);
  const start = opener.index! + opener[0].length;
  let depth = 1;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i);
    }
  }
  throw new Error(`Unterminated rule for ${selector}`);
}

describe("Shop section borders — issue #448", () => {
  test(".shop-voucher uses a solid border", () => {
    const body = topLevelRuleBody(shopCss, ".shop-voucher");
    expect(body).toMatch(/border\s*:\s*2px\s+solid\s+#b197fc/);
  });

  test(".shop-voucher does not use a dashed border", () => {
    const body = topLevelRuleBody(shopCss, ".shop-voucher");
    expect(body).not.toMatch(/border\s*:[^;]*dashed/);
  });

  test(".shop-packs uses a solid border", () => {
    const body = topLevelRuleBody(shopCss, ".shop-packs");
    expect(body).toMatch(/border\s*:\s*2px\s+solid\s+#fab005/);
  });

  test(".shop-packs does not use a dashed border", () => {
    const body = topLevelRuleBody(shopCss, ".shop-packs");
    expect(body).not.toMatch(/border\s*:[^;]*dashed/);
  });
});
