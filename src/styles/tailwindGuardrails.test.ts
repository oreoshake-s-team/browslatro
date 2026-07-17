// @vitest-environment node
/// <reference types="node" />
import { readdirSync, readFileSync } from "fs";
import { join, relative } from "path";

const SRC = join(__dirname, "..");
const tailwindCss = readFileSync(join(__dirname, "tailwind.css"), "utf8");

function collectTsxFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(full);
    return entry.name.endsWith(".tsx") ? [full] : [];
  });
}

const COLOR_PREFIXES =
  "(?:bg|text|border|outline|fill|stroke|ring|decoration|accent|caret|shadow|from|via|to)";
const PALETTE_NAMES =
  "(?:red|blue|green|yellow|orange|amber|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)";

const RULES: Readonly<Record<string, RegExp>> = {
  "arbitrary-color-value": new RegExp(
    `${COLOR_PREFIXES}-\\[(?:#|rgb|hsl|oklch|oklab|color\\()`,
  ),
  "default-palette-color": new RegExp(
    `\\b${COLOR_PREFIXES}-${PALETTE_NAMES}-\\d{2,3}\\b`,
  ),
  "transition-duration-override": /\b(?:duration|delay)-(?:\d|\[)/,
  "arbitrary-transition": /\btransition-\[/,
  "removed-focus-outline": /\bfocus-visible:outline-(?:none|hidden)\b/,
};

function firedRules(source: string): string[] {
  return Object.entries(RULES)
    .filter(([, pattern]) => pattern.test(source))
    .map(([name]) => name);
}

describe("tailwind theme contract", () => {
  test("the theme block is @theme inline so runtime token overrides propagate", () => {
    expect(tailwindCss).toMatch(/@theme inline \{/);
  });

  test("negative: no plain @theme block freezes token values at :root", () => {
    expect(tailwindCss).not.toMatch(/@theme \{/);
  });

  test("the default color palette is disabled", () => {
    expect(tailwindCss).toContain("--color-*: initial;");
  });

  test("every theme color maps to a design token", () => {
    const values = [...tailwindCss.matchAll(/--color-[a-z-]+: ([^;]+);/g)].map(
      (match) => match[1],
    );
    expect(values.filter((value) => !/^var\(--[a-z-]+\)$/.test(value))).toEqual(
      [],
    );
  });

  test("the default transition duration scales with --animation-speed", () => {
    expect(tailwindCss).toContain(
      "--default-transition-duration: calc(150ms * var(--animation-speed, 1));",
    );
  });

  test("the default transition timing function matches the legacy ease idiom", () => {
    expect(tailwindCss).toContain(
      "--default-transition-timing-function: ease;",
    );
  });

  test("the focus-ring utility reproduces the shared focus outline", () => {
    expect(tailwindCss).toMatch(
      /@utility focus-ring \{\s*&:focus-visible \{\s*outline: 2px solid var\(--focus-ring\);\s*outline-offset: 2px;/,
    );
  });

  test("the portrait-narrow variant matches the sidebar breakpoint", () => {
    expect(tailwindCss).toContain(
      "@custom-variant portrait-narrow (@media (orientation: portrait) and (width <= 768px));",
    );
  });

  test("preflight is not imported while legacy CSS coexists", () => {
    expect(tailwindCss).not.toContain("preflight");
  });
});

describe("className rules", () => {
  test("rejects an arbitrary hex color value", () => {
    expect(firedRules('className="bg-[#ff0000]"')).toContain(
      "arbitrary-color-value",
    );
  });

  test("rejects an arbitrary rgb color value", () => {
    expect(firedRules('className="text-[rgb(0,0,0)]"')).toContain(
      "arbitrary-color-value",
    );
  });

  test("rejects a default-palette color utility", () => {
    expect(firedRules('className="bg-red-500"')).toContain(
      "default-palette-color",
    );
  });

  test("rejects a literal transition duration", () => {
    expect(firedRules('className="transition-colors duration-150"')).toContain(
      "transition-duration-override",
    );
  });

  test("rejects an arbitrary transition value", () => {
    expect(firedRules('className="transition-[color_2s]"')).toContain(
      "arbitrary-transition",
    );
  });

  test("rejects removing the focus-visible outline", () => {
    expect(firedRules('className="focus-visible:outline-none"')).toContain(
      "removed-focus-outline",
    );
  });

  test("allows token-backed color utilities", () => {
    expect(firedRules('className="bg-accent-mult text-text-primary"')).toEqual(
      [],
    );
  });

  test("allows a token variable inside an arbitrary value", () => {
    expect(
      firedRules('className="shadow-[0_2px_8px_var(--shadow-md)]"'),
    ).toEqual([]);
  });

  test("allows non-color arbitrary values", () => {
    expect(firedRules('className="text-[0.78rem] gap-[0.4rem]"')).toEqual([]);
  });

  test("allows the bare transition utilities", () => {
    expect(firedRules('className="transition-colors focus-ring"')).toEqual([]);
  });
});

describe("repo-wide className scan", () => {
  test("no TSX file violates the tailwind guardrails", () => {
    const offenders = collectTsxFiles(SRC).flatMap((file) =>
      firedRules(readFileSync(file, "utf8")).map(
        (rule) => `${relative(SRC, file)}: ${rule}`,
      ),
    );
    expect(offenders).toEqual([]);
  });
});
