// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from "fs";
import { join } from "path";

const summaryCss = readFileSync(join(__dirname, "DeckSummary.css"), "utf8");

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

describe("DeckSummary dark theme — issue #887", () => {
  test("zebra rows use the raised surface token", () => {
    const body = topLevelRuleBody(summaryCss, ".deck-summary-row:nth-child(odd)");
    expect(body).toMatch(/background-color\s*:\s*var\(--surface-raised\)/);
  });

  test("counts use the primary text token", () => {
    const body = topLevelRuleBody(summaryCss, ".deck-summary-count");
    expect(body).toMatch(/color\s*:\s*var\(--text-primary\)/);
  });

  test("headings use the muted text token", () => {
    const body = topLevelRuleBody(summaryCss, ".deck-summary-heading");
    expect(body).toMatch(/color\s*:\s*var\(--text-muted\)/);
  });

  test("black-suit glyphs use the primary text token", () => {
    const body = topLevelRuleBody(summaryCss, ".deck-summary-glyph");
    expect(body).toMatch(/color\s*:\s*var\(--text-primary\)/);
  });

  test("red-suit glyphs use the red accent token", () => {
    const body = topLevelRuleBody(
      summaryCss,
      ".deck-summary-glyph-hearts,\n.deck-summary-glyph-diamonds",
    );
    expect(body).toMatch(/color\s*:\s*var\(--accent-mult\)/);
  });

  test("borders use the border token", () => {
    const list = topLevelRuleBody(summaryCss, ".deck-summary-list");
    expect(list).toMatch(/border\s*:\s*1px\s+solid\s+var\(--border\)/);
  });

  test("negative: no hardcoded light-palette hex colors remain", () => {
    expect(summaryCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});
