// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from "fs";
import { join } from "path";

const buttonsCss = readFileSync(join(__dirname, "buttons.css"), "utf8");
const indexTsx = readFileSync(join(__dirname, "..", "index.tsx"), "utf8");

const componentCss = (...segments: string[]): string =>
  readFileSync(join(__dirname, "..", "components", ...segments), "utf8");

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = buttonsCss.match(new RegExp(`(^|\\n)${escaped}\\s*{([^}]*)}`));
  if (!match) throw new Error(`Rule '${selector}' not found in buttons.css`);
  return match[2];
}

describe("button variant system", () => {
  test.each(["primary", "secondary", "danger", "ghost", "advisor", "toggle"])(
    "buttons.css defines the %s variant",
    (variant) => {
      expect(buttonsCss).toMatch(new RegExp(`\\.btn--${variant}\\s*{`));
    },
  );

  test("the toggle pressed state uses the chips accent token", () => {
    expect(ruleBody('.btn--toggle[aria-pressed="true"]')).toMatch(
      /background-color\s*:\s*var\(--accent-chips-strong\)/,
    );
  });

  test("negative: PackOpenModal.css no longer defines its own sort-button colors", () => {
    const css = componentCss("shop", "PackOpenModal.css");
    expect(css).not.toMatch(
      /\.pack-open-preview-sort-button\s*{[^}]*background-color/,
    );
  });

  test("negative: the shop Buy button no longer hardcodes its own radius", () => {
    const css = componentCss("shop", "Shop.css");
    expect(css).not.toMatch(/\.shop-offer-buy\s*{[^}]*border-radius/);
  });

  test("negative: BlindSelectScreen.css no longer gives the boss reroll its own radius", () => {
    const css = componentCss("game", "BlindSelectScreen.css");
    expect(css).not.toMatch(/\.blind-select-boss-reroll\s*{[^}]*border-radius/);
  });

  test("the shared base sets a single radius", () => {
    expect(ruleBody(".btn")).toMatch(/border-radius\s*:\s*6px/);
  });

  test("the shared focus state uses the focus-ring token", () => {
    expect(ruleBody(".btn:focus-visible")).toMatch(
      /outline\s*:\s*2px solid var\(--focus-ring\)/,
    );
  });

  test("disabled buttons share one treatment", () => {
    expect(ruleBody(".btn:disabled")).toMatch(/cursor\s*:\s*not-allowed/);
  });

  test("primary uses the success accent token", () => {
    expect(ruleBody(".btn--primary")).toMatch(
      /background-color\s*:\s*var\(--accent-success\)/,
    );
  });

  test("danger uses the danger accent token", () => {
    expect(ruleBody(".btn--danger")).toMatch(
      /background-color\s*:\s*var\(--accent-danger\)/,
    );
  });

  test("buttons.css is imported in the app entry point", () => {
    expect(indexTsx).toContain('import "./styles/buttons.css"');
  });

  test("negative: RoundWonModal.css no longer hardcodes its own button blue", () => {
    expect(componentCss("game", "RoundWonModal.css")).not.toContain("#1971c2");
  });

  test("negative: BlindSelectScreen.css no longer redefines play/skip button colors", () => {
    const css = componentCss("game", "BlindSelectScreen.css");
    expect(css).not.toMatch(/\.blind-select-play\s*{[^}]*background-color/);
  });

  test("negative: the shop reroll no longer uses white-on-orange", () => {
    const css = componentCss("shop", "Shop.css");
    expect(css).not.toMatch(/\.shop-reroll\s*{[^}]*color\s*:\s*white/);
  });

  test("advisor uses the wild border token", () => {
    expect(ruleBody(".btn--advisor")).toMatch(/var\(--enhance-wild-border\)/);
  });

  test("the advisor pressed state stays in the wild-border family", () => {
    expect(ruleBody('.btn--advisor[aria-pressed="true"]')).toMatch(
      /var\(--enhance-wild-border\)/,
    );
  });

  test("negative: Game.css no longer gives the autopilot toggle its own pressed color", () => {
    const css = componentCss("game", "Game.css");
    expect(css).not.toMatch(
      /\.autopilot-toggle-button\[aria-pressed="true"\]\s*{/,
    );
  });

  test("negative: AutopilotControls.css no longer defines advisor button colors", () => {
    const css = componentCss("game", "AutopilotControls.css");
    expect(css).not.toMatch(/\.autopilot-askai-button\s*{[^}]*background-color/);
  });
});
