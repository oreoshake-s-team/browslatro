// @vitest-environment node
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "Card.css"), "utf8");

function ruleFor(selector: string): string {
  const re = new RegExp(
    `${selector.replace(/[.+*?^$()\\[\\]{}|]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
    "m",
  );
  const m = css.match(re);
  if (!m) throw new Error(`no rule for ${selector}`);
  return m[1];
}

describe("Card .card-discarding animation cascade (#609)", () => {
  test("the card-discard animation declaration is !important so later scoring classes cannot override it", () => {
    const body = ruleFor(".card-discarding");
    expect(body).toMatch(/animation:\s*card-discard[^;]*!important/);
  });

  test("the lucky scoring classes still set their own animation (negative — we keep the pulse, just don't let it win over discard)", () => {
    const body = ruleFor(".card-lucky-mult-scoring,\\s*\\.card-lucky-money-scoring");
    expect(body).toMatch(/animation:\s*card-lucky-pulse/);
  });
});
