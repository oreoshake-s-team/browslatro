// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from "fs";
import { join } from "path";

const traceCss = readFileSync(join(__dirname, "ScoringTrace.css"), "utf8");
const modalCss = readFileSync(join(__dirname, "ScoringTraceModal.css"), "utf8");

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

describe("ScoringTrace step numbers — clip-proof tabular gutter", () => {
  const listBody = blockBody(traceCss, /(^|\n)\.scoring-trace__list\s*{/);
  const itemBody = blockBody(traceCss, /(^|\n)\.scoring-trace__item\s*{/);
  const beforeBody = blockBody(traceCss, /(^|\n)\.scoring-trace__item::before\s*{/);

  test("the list drops native markers so nothing hangs in the overflow-clipped gutter", () => {
    expect(listBody).toMatch(/list-style\s*:\s*none/);
  });

  test("the list no longer reserves a padding-left marker gutter that clips (negative)", () => {
    expect(listBody).not.toMatch(/padding-left/);
  });

  test("the list seeds a counter so steps can be numbered without native markers", () => {
    expect(listBody).toMatch(/counter-reset\s*:\s*scoring-step/);
  });

  test("each step renders its number from the counter", () => {
    expect(beforeBody).toMatch(/content\s*:\s*counter\(scoring-step\)/);
  });

  test("step numbers occupy a fixed character-width column so they cannot be clipped", () => {
    expect(itemBody).toMatch(/grid-template-columns\s*:\s*3(\.\d+)?ch\s+minmax/);
  });

  test("step numbers are right-aligned so the periods line up tabularly", () => {
    expect(beforeBody).toMatch(/text-align\s*:\s*right/);
  });

  test("the number never wraps, so a two-digit step keeps its period on one line", () => {
    expect(beforeBody).toMatch(/white-space\s*:\s*nowrap/);
  });
});

describe("ScoringTraceModal step numbers — gutter scales with font, no fixed clip", () => {
  const modalListBody = blockBody(
    modalCss,
    /\.scoring-trace-modal__body \.scoring-trace__list\s*{/,
  );

  test("the modal no longer pins a fixed padding-left marker gutter (negative)", () => {
    expect(modalListBody).not.toMatch(/padding-left/);
  });
});
