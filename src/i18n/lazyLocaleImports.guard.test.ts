import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SRC_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATIC_HAW_IMPORT = /^import\s(?!type\b)[^;]*from\s+["'][^"']*locales\/haw["']/m;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    if (/\.(test|stories)\.(ts|tsx)$/.test(entry.name)) return [];
    return [path];
  });
}

describe("lazy locale import guard", () => {
  test("no production module statically imports a non-English locale", () => {
    const offenders = sourceFiles(SRC_ROOT).filter((path) =>
      STATIC_HAW_IMPORT.test(readFileSync(path, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
