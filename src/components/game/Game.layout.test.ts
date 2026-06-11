// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from "fs";
import { join } from "path";

const gameCss = readFileSync(join(__dirname, "Game.css"), "utf8");
const appCss = readFileSync(join(__dirname, "..", "..", "App.css"), "utf8");

function gameRuleBody(): string {
  const match = gameCss.match(/\.game\s*{([^}]*)}/);
  if (!match) throw new Error(".game rule not found in Game.css");
  return match[1];
}

function appRuleBody(): string {
  const match = appCss.match(/\.App\s*{([^}]*)}/);
  if (!match) throw new Error(".App rule not found in App.css");
  return match[1];
}

describe("Game layout — landscape mobile regression", () => {
  test(".game allows its content to scroll when it overflows the viewport", () => {
    expect(gameRuleBody()).toMatch(/overflow-y\s*:\s*auto/);
  });

  test(".game anchors content to the top so the column is never clipped", () => {
    expect(gameRuleBody()).toMatch(/justify-content\s*:\s*flex-start/);
  });

  test(".game sets min-height: 0 so the flex item can shrink below its content size", () => {
    expect(gameRuleBody()).toMatch(/min-height\s*:\s*0/);
  });

  test(".App uses the dynamic viewport unit (dvh) for its height", () => {
    expect(appRuleBody()).toMatch(/height\s*:\s*100dvh/);
  });

  test(".App still ships a 100vh fallback for browsers without dvh support", () => {
    expect(appRuleBody()).toMatch(/height\s*:\s*100vh/);
  });

  test(".game does not use plain `justify-content: center` (would clip top of column)", () => {
    expect(gameRuleBody()).not.toMatch(/justify-content\s*:\s*center\b/);
  });
});
