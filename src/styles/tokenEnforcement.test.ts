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
      ":root { --accent-mult: #fa5252; --shadow-sm: rgba(0, 0, 0, 0.15); }",
      tokensFile,
    );
    expect(rules).toEqual([]);
  });
});
