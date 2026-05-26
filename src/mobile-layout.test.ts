// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from "fs";
import { join } from "path";

const handCss = readFileSync(
  join(__dirname, "components", "cards", "Hand.css"),
  "utf8",
);
const sidebarCss = readFileSync(
  join(__dirname, "components", "hud", "Sidebar.css"),
  "utf8",
);
const appCss = readFileSync(join(__dirname, "App.css"), "utf8");
const gameCss = readFileSync(
  join(__dirname, "components", "game", "Game.css"),
  "utf8",
);

function handCardsRuleBody(): string {
  const match = handCss.match(/\.hand-cards\s*{([^}]*)}/);
  if (!match) throw new Error(".hand-cards rule not found in Hand.css");
  return match[1];
}

function blockBody(source: string, openerPattern: RegExp): string {
  const opener = source.match(openerPattern);
  if (!opener) {
    throw new Error(`Block opener ${openerPattern} not found`);
  }
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

describe("Hand layout — no wrap, scroll instead (issue #105)", () => {
  test(".hand-cards uses flex-wrap: nowrap so the row never wraps", () => {
    expect(handCardsRuleBody()).toMatch(/flex-wrap\s*:\s*nowrap/);
  });

  test(".hand-cards uses overflow-x: clip so over-cap hands squish instead of producing a scrollbar (issue #210)", () => {
    expect(handCardsRuleBody()).toMatch(/overflow-x\s*:\s*clip/);
  });

  test(".hand-cards uses justify-content: safe center so the leftmost card is reachable when scrolling", () => {
    expect(handCardsRuleBody()).toMatch(/justify-content\s*:\s*safe\s+center/);
  });

  test(".hand-cards does not still set flex-wrap: wrap", () => {
    expect(handCardsRuleBody()).not.toMatch(/flex-wrap\s*:\s*wrap\b/);
  });
});

describe("Sidebar layout — landscape mobile (issue #105)", () => {
  const landscapeBlock = blockBody(
    sidebarCss,
    /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-width:\s*1024px\)\s*{/,
  );

  test("landscape narrow viewports shrink the sidebar width", () => {
    const inner = blockBody(landscapeBlock, /\.sidebar\s*{/);
    expect(inner).toMatch(/width\s*:\s*180px/);
  });

  test("landscape narrow viewports stack sub-info-progress as a column to save horizontal space", () => {
    const inner = blockBody(landscapeBlock, /\.sub-info-progress\s*{/);
    expect(inner).toMatch(/flex-direction\s*:\s*column/);
  });
});

describe("Sidebar layout — portrait mobile (issue #105)", () => {
  const portraitBlock = blockBody(
    sidebarCss,
    /@media\s*\(orientation:\s*portrait\)\s*and\s*\(max-width:\s*768px\)\s*{/,
  );

  test("portrait narrow viewports lay the sidebar out as a horizontal strip", () => {
    const inner = blockBody(portraitBlock, /\.sidebar\s*{/);
    expect(inner).toMatch(/flex-direction\s*:\s*row/);
  });

  test("portrait narrow viewports widen the sidebar to span the full width", () => {
    const inner = blockBody(portraitBlock, /\.sidebar\s*{/);
    expect(inner).toMatch(/width\s*:\s*100%/);
  });
});

describe("App layout — portrait mobile (issue #105)", () => {
  test("portrait narrow viewports stack the App as a column so the sidebar sits above the game", () => {
    const block = blockBody(
      appCss,
      /@media\s*\(orientation:\s*portrait\)\s*and\s*\(max-width:\s*768px\)\s*{/,
    );
    const inner = blockBody(block, /\.App\s*{/);
    expect(inner).toMatch(/flex-direction\s*:\s*column/);
  });
});

describe("Game layout — mobile spacing (issue #105)", () => {
  test("narrow viewports reduce the .game padding to free up room for the hand", () => {
    const block = blockBody(
      gameCss,
      /@media\s*\(max-width:\s*1024px\)\s*{/,
    );
    const inner = blockBody(block, /\.game\s*{/);
    expect(inner).toMatch(/padding\s*:\s*1rem/);
  });
});
