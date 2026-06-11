// @vitest-environment node
/// <reference types="node" />
import { readFileSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";

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

function collectCssFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...collectCssFiles(full));
    } else if (extname(entry) === ".css" && entry !== "tokens.css") {
      files.push(full);
    }
  }
  return files;
}

describe("no raw color literals in component CSS (issue #1129)", () => {
  const srcDir = join(__dirname, "..");
  const cssFiles = collectCssFiles(srcDir);

  const LITERAL_COLOR_RE =
    /(?<![a-z])#[0-9a-fA-F]{3,8}(?![0-9a-fA-F])|(?<!\w)rgba?\s*\(|(?<!\w)hsla?\s*\(/;
  const NAMED_COLOR_RE = /\bwhite\b|\bblack\b/;

  function stripTokenRefs(line: string): string {
    return line
      .replace(/var\(--[^)]+\)/g, "TOKEN")
      .replace(/color-mix\(in\s+\w+,\s*[^)]+\)/g, "COLORMIX");
  }

  function lineHasRawColor(raw: string): boolean {
    const line = stripTokenRefs(raw);
    if (LITERAL_COLOR_RE.test(line)) return true;
    const colonIdx = line.lastIndexOf(":");
    if (colonIdx === -1) return false;
    return NAMED_COLOR_RE.test(line.slice(colonIdx + 1));
  }

  function getNonCommentLines(content: string): string[] {
    return content
      .split("\n")
      .filter(
        (l) =>
          !l.trim().startsWith("/*") &&
          !l.trim().startsWith("*") &&
          !l.trim().startsWith("//"),
      );
  }

  test.each(cssFiles.map((f) => [f.replace(srcDir + "/", ""), f]))(
    "no raw literals in %s",
    (_, fullPath) => {
      const content = readFileSync(fullPath, "utf8");
      const violatingLines = getNonCommentLines(content).filter(lineHasRawColor);
      expect(violatingLines).toHaveLength(0);
    },
  );

  test("tokens.css is the only file allowed to contain raw color literals", () => {
    const violatingFiles = cssFiles.filter((f) => {
      const content = readFileSync(f, "utf8");
      return getNonCommentLines(content).some(lineHasRawColor);
    });
    expect(violatingFiles).toHaveLength(0);
  });
});
