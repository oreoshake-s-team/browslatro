// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from "fs";
import { join } from "path";

const handCss = readFileSync(join(__dirname, "Hand.css"), "utf8");

function portraitBlock(source: string): string {
  const idx = source.indexOf("@media (orientation: portrait)");
  if (idx === -1) throw new Error("portrait media query not found");
  return source.slice(idx);
}

describe("Hand layout — desktop squish preserved", () => {
  test("the dealt hand clips instead of scrolling at desktop widths", () => {
    expect(handCss).toMatch(/\.hand-cards\s*{[^}]*overflow-x\s*:\s*clip/);
  });
});

describe("Hand layout — portrait scroll", () => {
  test("the dealt hand scrolls horizontally in portrait", () => {
    const block = portraitBlock(handCss);
    expect(block).toMatch(/\.hand-cards\s*{[^}]*overflow-x\s*:\s*auto/);
  });

  test("card slots keep their full width in portrait so the row scrolls instead of squishing", () => {
    const block = portraitBlock(handCss);
    expect(block).toMatch(
      /\.hand-card-slot\s*{[^}]*flex\s*:\s*0\s+0\s+var\(--card-width\)/,
    );
  });

  test("the scroll row shows a thin scrollbar so the overflow is discoverable", () => {
    const block = portraitBlock(handCss);
    expect(block).toMatch(/\.hand-cards\s*{[^}]*scrollbar-width\s*:\s*thin/);
  });

  test("the scroll row fades its edges to hint at off-screen cards", () => {
    const block = portraitBlock(handCss);
    expect(block).toMatch(/\.hand-cards\s*{[^}]*mask-image\s*:\s*linear-gradient/);
  });
});
