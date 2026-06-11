// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from "fs";
import { join } from "path";

const componentCss = (...segments: string[]): string =>
  readFileSync(join(__dirname, "..", "components", ...segments), "utf8");

function ruleBody(css: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`(^|\\n)${escaped}\\s*{([^}]*)}`));
  if (!match) throw new Error(`Rule '${selector}' not found`);
  return match[2];
}

const blindSelectCss = componentCss("game", "BlindSelectScreen.css");
const shopCss = componentCss("shop", "Shop.css");
const handCss = componentCss("cards", "Hand.css");
const packOpenCss = componentCss("shop", "PackOpenModal.css");

describe("focus-visible outlines", () => {
  test("boss-blind override focus-visible uses the focus-ring token", () => {
    expect(
      ruleBody(blindSelectCss, ".blind-select-boss-override:focus-visible"),
    ).toMatch(/outline\s*:\s*2px solid var\(--focus-ring\)/);
  });

  test("negative: boss-blind override focus-visible no longer removes the outline", () => {
    expect(
      ruleBody(blindSelectCss, ".blind-select-boss-override:focus-visible"),
    ).not.toMatch(/outline\s*:\s*none/);
  });

  test("boss-blind override hover stays distinct from focus", () => {
    expect(
      ruleBody(blindSelectCss, ".blind-select-boss-override:hover"),
    ).not.toMatch(/outline/);
  });

  test("shop voucher override focus-visible draws a high-contrast outline", () => {
    expect(
      ruleBody(shopCss, ".shop-voucher-override:focus-visible"),
    ).toMatch(/outline\s*:\s*2px solid var\(--type-tarot-accent\)/);
  });

  test("negative: shop voucher override focus-visible no longer removes the outline", () => {
    expect(
      ruleBody(shopCss, ".shop-voucher-override:focus-visible"),
    ).not.toMatch(/outline\s*:\s*none/);
  });

  test("hand-sort buttons gain a focus-visible outline", () => {
    expect(ruleBody(handCss, ".hand-sort-button:focus-visible")).toMatch(
      /outline\s*:\s*2px solid var\(--focus-ring\)/,
    );
  });

  test("hand-sort focus outline is inset so the clipped group cannot hide it", () => {
    expect(ruleBody(handCss, ".hand-sort-button:focus-visible")).toMatch(
      /outline-offset\s*:\s*-2px/,
    );
  });

  test("pack preview sort buttons gain a focus-visible outline", () => {
    expect(
      ruleBody(packOpenCss, ".pack-open-preview-sort-button:focus-visible"),
    ).toMatch(/outline\s*:\s*2px solid var\(--focus-ring\)/);
  });

  test("negative: no focus-visible rule in the touched files suppresses the outline", () => {
    for (const css of [blindSelectCss, shopCss, handCss, packOpenCss]) {
      expect(css).not.toMatch(
        /:focus-visible[^{]*{[^}]*outline\s*:\s*none/,
      );
    }
  });
});

const scoringTraceCss = componentCss("hud", "ScoringTrace.css");
const scoringTraceModalCss = componentCss("hud", "ScoringTraceModal.css");

describe("scoring trace focus-visible outlines", () => {
  test("inline trace scroll focus-visible uses the focus-ring token", () => {
    expect(
      ruleBody(scoringTraceCss, ".scoring-trace__scroll:focus-visible"),
    ).toMatch(/outline\s*:\s*2px solid var\(--focus-ring\)/);
  });

  test("inline trace scroll focus outline is inset so flush panels cannot hide it", () => {
    expect(
      ruleBody(scoringTraceCss, ".scoring-trace__scroll:focus-visible"),
    ).toMatch(/outline-offset\s*:\s*-2px/);
  });

  test("modal body focus-visible uses the focus-ring token", () => {
    expect(
      ruleBody(scoringTraceModalCss, ".scoring-trace-modal__body:focus-visible"),
    ).toMatch(/outline\s*:\s*2px solid var\(--focus-ring\)/);
  });

  test("modal body focus outline is inset so flush panels cannot hide it", () => {
    expect(
      ruleBody(scoringTraceModalCss, ".scoring-trace-modal__body:focus-visible"),
    ).toMatch(/outline-offset\s*:\s*-2px/);
  });

  test("negative: the inline trace scroll base rule no longer suppresses the outline", () => {
    expect(ruleBody(scoringTraceCss, ".scoring-trace__scroll")).not.toMatch(
      /outline\s*:\s*none/,
    );
  });

  test("negative: the modal body base rule no longer suppresses the outline", () => {
    expect(
      ruleBody(scoringTraceModalCss, ".scoring-trace-modal__body"),
    ).not.toMatch(/outline\s*:\s*none/);
  });

  test("negative: no focus-visible rule in the trace files suppresses the outline", () => {
    for (const css of [scoringTraceCss, scoringTraceModalCss]) {
      expect(css).not.toMatch(/:focus-visible[^{]*{[^}]*outline\s*:\s*none/);
    }
  });
});
