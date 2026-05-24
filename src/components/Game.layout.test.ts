/// <reference types="node" />
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Layout regression coverage for issue #50 — cards row clipped in
 * landscape mobile.
 *
 * jsdom does not implement a real CSS layout engine, so we can't observe
 * computed heights or overflow behavior in a unit test. Instead we read the
 * raw CSS file and assert that the small set of rules required for the play
 * area to remain reachable on a short viewport is present. Each rule below
 * corresponds to a distinct failure mode that was reproduced in the browser.
 */

const gameCss = readFileSync(join(__dirname, "Game.css"), "utf8");
const appCss = readFileSync(join(__dirname, "..", "App.css"), "utf8");

function gameRuleBody(): string {
  // Extract just the `.game { ... }` block so assertions are scoped to it.
  const match = gameCss.match(/\.game\s*{([^}]*)}/);
  if (!match) throw new Error(".game rule not found in Game.css");
  return match[1];
}

function appRuleBody(): string {
  const match = appCss.match(/\.App\s*{([^}]*)}/);
  if (!match) throw new Error(".App rule not found in App.css");
  return match[1];
}

describe("Game layout — landscape mobile regression (issue #50)", () => {
  test(".game allows its content to scroll when it overflows the viewport", () => {
    expect(gameRuleBody()).toMatch(/overflow-y\s*:\s*auto/);
  });

  test(".game uses safe centering so the top of the column is never clipped", () => {
    // `safe center` falls back to flex-start when content overflows; plain
    // `center` would clip the cards row at the top in landscape mobile.
    expect(gameRuleBody()).toMatch(/justify-content\s*:\s*safe\s+center/);
  });

  test(".game sets min-height: 0 so the flex item can shrink below its content size", () => {
    // Without this, overflow-y:auto is silently ignored on flex children
    // whose parent constrains their height.
    expect(gameRuleBody()).toMatch(/min-height\s*:\s*0/);
  });

  test(".App uses the dynamic viewport unit (dvh) for its height", () => {
    // dvh accounts for collapsing mobile browser chrome (address bar).
    expect(appRuleBody()).toMatch(/height\s*:\s*100dvh/);
  });

  test(".App still ships a 100vh fallback for browsers without dvh support", () => {
    expect(appRuleBody()).toMatch(/height\s*:\s*100vh/);
  });

  // Negative case: the previous (buggy) declaration must not creep back in.
  test(".game does not use plain `justify-content: center` (would clip top of column)", () => {
    expect(gameRuleBody()).not.toMatch(/justify-content\s*:\s*center\b/);
  });
});
