// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from "fs";
import { join } from "path";

const tokensCss = readFileSync(join(__dirname, "tokens.css"), "utf8");
const indexCss = readFileSync(join(__dirname, "..", "index.css"), "utf8");
const indexTsx = readFileSync(join(__dirname, "..", "index.tsx"), "utf8");

const REQUIRED_TOKENS = [
  "--bg",
  "--surface",
  "--surface-raised",
  "--surface-sunken",
  "--surface-hover",
  "--border",
  "--border-strong",
  "--text-primary",
  "--text-secondary",
  "--text-muted",
  "--accent-chips",
  "--accent-mult",
  "--accent-money",
  "--accent-success",
  "--accent-danger",
  "--focus-ring",
] as const;

describe("design tokens (issue #873)", () => {
  test.each(REQUIRED_TOKENS)("tokens.css defines %s", (token) => {
    expect(tokensCss).toMatch(new RegExp(`${token}\\s*:\\s*[^;]+;`));
  });

  test("tokens are declared on :root so every component can consume them", () => {
    expect(tokensCss).toMatch(/^:root\s*{/);
  });

  test("tokens.css is imported before index.css in the app entry point", () => {
    const tokensIdx = indexTsx.indexOf('import "./styles/tokens.css"');
    const indexIdx = indexTsx.indexOf('import "./index.css"');
    expect(tokensIdx).toBeGreaterThanOrEqual(0);
    expect(tokensIdx).toBeLessThan(indexIdx);
  });

  test("body uses the dark background token", () => {
    expect(indexCss).toMatch(/body\s*{[^}]*background-color\s*:\s*var\(--bg\)/);
  });

  test("negative: tokens.css does not define duplicate token names", () => {
    const names = [...tokensCss.matchAll(/(--[a-z-]+)\s*:/g)].map((m) => m[1]);
    expect(new Set(names).size).toBe(names.length);
  });
});

const CONTRAST_TOKENS = [
  "--positive-money-on-light",
  "--shop-price",
  "--shop-muted-on-light",
  "--suit-green-on-light",
  "--suit-blue-on-light",
] as const;

describe("contrast tokens (issue #911)", () => {
  test.each(CONTRAST_TOKENS)("tokens.css defines %s", (token) => {
    expect(tokensCss).toMatch(new RegExp(`${token}\\s*:\\s*[^;]+;`));
  });

  test("negative: audited shop styles no longer hardcode the failing greens", () => {
    const shopCss = readFileSync(
      join(__dirname, "..", "components", "shop", "Shop.css"),
      "utf8",
    );
    expect(shopCss).not.toMatch(/\n\s*color:\s*#099268/);
    expect(shopCss).not.toMatch(/\n\s*color:\s*#2b8a3e/);
  });
});
