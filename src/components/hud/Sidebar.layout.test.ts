// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from "fs";
import { join } from "path";

const sidebarCss = readFileSync(join(__dirname, "Sidebar.css"), "utf8");
const indexCss = readFileSync(
  join(__dirname, "..", "..", "index.css"),
  "utf8",
);
const roundProgressCss = readFileSync(
  join(__dirname, "RoundProgress.css"),
  "utf8",
);
const runProgressCss = readFileSync(
  join(__dirname, "RunProgress.css"),
  "utf8",
);

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

describe("Sidebar layout", () => {
  test(".sub-info-progress places buttons and stats side by side and stretches them to equal height", () => {
    const body = topLevelRuleBody(sidebarCss, ".sub-info-progress");
    expect(body).toMatch(/flex-direction\s*:\s*row/);
    expect(body).toMatch(/align-items\s*:\s*stretch/);
  });

  test(".sub-info > button stretches buttons to fill the column's full vertical space", () => {
    const body = topLevelRuleBody(sidebarCss, ".sub-info > button");
    expect(body).toMatch(/flex\s*:\s*1\s+1\s+0/);
  });

  test(".sub-info and .progress each claim half of the row", () => {
    const subInfo = topLevelRuleBody(sidebarCss, ".sub-info");
    const progress = topLevelRuleBody(sidebarCss, ".progress");
    expect(subInfo).toMatch(/flex\s*:\s*1\s+1\s+0/);
    expect(progress).toMatch(/flex\s*:\s*1\s+1\s+0/);
  });
});

describe("Stat boxes visual treatment", () => {
  test(".stat renders as a visually distinct box (background, border, radius)", () => {
    const body = topLevelRuleBody(indexCss, ".stat");
    expect(body).toMatch(/background-color\s*:\s*var\(--surface-raised\)/);
    expect(body).toMatch(/border\s*:\s*1px\s+solid\s+var\(--border\)/);
    expect(body).toMatch(/border-radius\s*:\s*6px/);
  });
});

describe("Progress rows row composition", () => {
  test(".round-progress > .stat splits hands and discards evenly", () => {
    const body = topLevelRuleBody(roundProgressCss, ".round-progress > .stat");
    expect(body).toMatch(/flex\s*:\s*1\s+1\s+0/);
  });

  test(".run-progress > .stat makes Money span the full row width", () => {
    const body = topLevelRuleBody(runProgressCss, ".run-progress > .stat");
    expect(body).toMatch(/width\s*:\s*100%/);
  });

  test(".run-progress-row > .stat splits ante and round evenly", () => {
    const body = topLevelRuleBody(runProgressCss, ".run-progress-row > .stat");
    expect(body).toMatch(/flex\s*:\s*1\s+1\s+0/);
  });
});

describe("Portrait sidebar grid", () => {
  function portraitBlock(source: string): string {
    const idx = source.indexOf("@media (orientation: portrait)");
    if (idx === -1) throw new Error("portrait media query not found");
    return source.slice(idx);
  }

  test("the portrait sidebar splits into two equal-width columns", () => {
    const block = portraitBlock(sidebarCss);
    expect(block).toMatch(
      /\.sidebar\s*{[^}]*grid-template-columns\s*:\s*minmax\(0, 1fr\) minmax\(0, 1fr\)/,
    );
  });

  test("the scores stack in the first column", () => {
    const block = portraitBlock(sidebarCss);
    expect(block).toMatch(/\.sidebar > \.round-info\s*{[^}]*grid-column\s*:\s*1/);
    expect(block).toMatch(/\.sidebar > \.hand-score\s*{[^}]*grid-column\s*:\s*1/);
  });

  test("the controls fill the second column and span all three score rows", () => {
    const block = portraitBlock(sidebarCss);
    expect(block).toMatch(
      /\.sidebar > \.sub-info-progress\s*{[^}]*grid-column\s*:\s*2[^}]*grid-row\s*:\s*1 \/ 4/,
    );
  });

  test("the inline scoring trace is hidden in portrait so the log moves behind a button", () => {
    const block = portraitBlock(sidebarCss);
    expect(block).toMatch(/\.sidebar > \.scoring-trace\s*{[^}]*display\s*:\s*none/);
  });

  test("portrait sub-info is a two-column grid so the action buttons split the row evenly", () => {
    const block = portraitBlock(sidebarCss);
    expect(block).toMatch(
      /\.sub-info\s*{[^}]*grid-template-columns\s*:\s*1fr 1fr/,
    );
  });

  test("the scoring-log button is revealed in portrait", () => {
    const block = portraitBlock(sidebarCss);
    expect(block).toMatch(
      /\.sub-info__scoring-log\s*{[^}]*display\s*:\s*inline-flex/,
    );
  });

  test("the scoring-log button is hidden outside portrait (negative)", () => {
    const body = topLevelRuleBody(sidebarCss, ".sub-info__scoring-log");
    expect(body).toMatch(/display\s*:\s*none/);
  });
});
