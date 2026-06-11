// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from "fs";
import { join } from "path";

const scoringTraceCss = readFileSync(join(__dirname, "ScoringTrace.css"), "utf8");

function blockBody(source: string, openerPattern: RegExp): string {
  const opener = source.match(openerPattern);
  if (!opener) throw new Error(`Block opener ${openerPattern} not found`);
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
  throw new Error(`Unterminated block for ${openerPattern}`);
}

describe("ScoringTrace layout — fills remaining vertical space", () => {
  const traceBody = blockBody(scoringTraceCss, /(^|\n)\.scoring-trace\s*{/);
  const scrollBody = blockBody(scoringTraceCss, /(^|\n)\.scoring-trace__scroll\s*{/);

  test(".scoring-trace grows to claim the remaining column height", () => {
    expect(traceBody).toMatch(/flex\s*:\s*1\s+1\s+auto/);
  });

  test(".scoring-trace can shrink below its content so the inner region scrolls", () => {
    expect(traceBody).toMatch(/min-height\s*:\s*0/);
  });

  test(".scoring-trace__scroll keeps scrolling internally on overflow", () => {
    expect(scrollBody).toMatch(/overflow-y\s*:\s*auto/);
  });

  test(".scoring-trace__scroll no longer caps its height at a fixed max-height (negative)", () => {
    expect(scrollBody).not.toMatch(/max-height/);
  });
});

describe("ScoringTrace layout — portrait strip preserved", () => {
  const portraitBlock = blockBody(
    scoringTraceCss,
    /@media\s*\(orientation:\s*portrait\)\s*and\s*\(max-width:\s*768px\)\s*{/,
  );

  test("portrait resets the trace so it does not grow inside the horizontal strip", () => {
    const inner = blockBody(portraitBlock, /\.scoring-trace\s*{/);
    expect(inner).toMatch(/flex\s*:\s*0\s+0\s+auto/);
  });

  test("portrait restores the scroll height cap so the strip does not balloon", () => {
    const inner = blockBody(portraitBlock, /\.scoring-trace__scroll\s*{/);
    expect(inner).toMatch(/max-height\s*:\s*22rem/);
  });
});
