import { resolve } from "node:path";
import stylelint from "stylelint";
import { describe, expect, it } from "vitest";

const configFile = resolve(process.cwd(), ".stylelintrc.json");

async function firedRules(code: string, codeFilename: string): Promise<string[]> {
  const { results } = await stylelint.lint({ code, codeFilename, configFile });
  return results[0].warnings.map((warning) => warning.rule);
}

const componentFile = resolve(process.cwd(), "src/components/probe/Probe.css");
const tokensFile = resolve(process.cwd(), "src/styles/tokens.css");

describe("design-token enforcement", () => {
  it("rejects a raw hex color in component CSS", async () => {
    const rules = await firedRules(".probe { color: #ff0000; }", componentFile);
    expect(rules).toContain("color-no-hex");
  });

  it("rejects a raw rgba() color in component CSS", async () => {
    const rules = await firedRules(
      ".probe { background: rgba(0, 0, 0, 0.5); }",
      componentFile,
    );
    expect(rules).toContain("function-disallowed-list");
  });

  it("rejects a raw hsl() color in component CSS", async () => {
    const rules = await firedRules(
      ".probe { color: hsl(0, 100%, 50%); }",
      componentFile,
    );
    expect(rules).toContain("function-disallowed-list");
  });

  it("allows a token reference in component CSS", async () => {
    const rules = await firedRules(
      ".probe { color: var(--accent-mult); }",
      componentFile,
    );
    expect(rules).toEqual([]);
  });

  it("allows color-mix over a token in component CSS", async () => {
    const rules = await firedRules(
      ".probe { background: color-mix(in srgb, var(--black) 45%, transparent); }",
      componentFile,
    );
    expect(rules).toEqual([]);
  });

  it("allows raw color literals inside tokens.css", async () => {
    const rules = await firedRules(
      ":root {\n  --accent-mult: #fa5252;\n  --shadow-sm: rgb(0 0 0 / 15%);\n}\n",
      tokensFile,
    );
    expect(rules).toEqual([]);
  });

  it("rejects a named color in component CSS", async () => {
    const rules = await firedRules(".probe { color: white; }", componentFile);
    expect(rules).toContain("color-named");
  });

  it("allows the transparent keyword in component CSS", async () => {
    const rules = await firedRules(
      ".probe { background: transparent; }",
      componentFile,
    );
    expect(rules).not.toContain("color-named");
  });
});

describe("stylelint-config-standard adoption", () => {
  it("flags a deprecated property in component CSS", async () => {
    const rules = await firedRules(
      ".probe { clip: rect(0, 0, 0, 0); }",
      componentFile,
    );
    expect(rules).toContain("property-no-deprecated");
  });

  it("flags legacy max-width media query notation", async () => {
    const rules = await firedRules(
      "@media (max-width: 768px) { .probe { color: var(--text-primary); } }",
      componentFile,
    );
    expect(rules).toContain("media-feature-range-notation");
  });

  it("allows kebab-case BEM class selectors", async () => {
    const rules = await firedRules(
      ".scoring-trace__list--money { color: var(--text-primary); }",
      componentFile,
    );
    expect(rules).not.toContain("selector-class-pattern");
  });

  it("flags a PascalCase class selector", async () => {
    const rules = await firedRules(
      ".App { color: var(--text-primary); }",
      componentFile,
    );
    expect(rules).toContain("selector-class-pattern");
  });
});
