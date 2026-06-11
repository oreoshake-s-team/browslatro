// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { describe, expect, test } from "vitest";

const RUNTIME_IMPORT = /^import\s+(?!type\s)[^;]*?from\s+"(\.[^"]+)";?/gms;

interface Edge {
  readonly file: string;
  readonly specifier: string;
}

function emittedToSource(path: string): string {
  return path.replace(/\.js$/, ".ts");
}

function traceRuntimeGraph(entry: string): ReadonlyArray<Edge> {
  const edges: Edge[] = [];
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || seen.has(file)) continue;
    seen.add(file);
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(RUNTIME_IMPORT)) {
      const specifier = match[1];
      edges.push({ file, specifier });
      const target = emittedToSource(
        normalize(join(dirname(file), specifier)),
      );
      if (existsSync(target)) queue.push(target);
    }
  }
  return edges;
}

describe("api/advice ESM import graph", () => {
  test("every runtime relative import carries an explicit .js extension", () => {
    const offenders = traceRuntimeGraph("api/advice.ts").filter(
      (edge) => !edge.specifier.endsWith(".js"),
    );
    expect(offenders).toEqual([]);
  });

  test("every runtime relative import resolves to a real module", () => {
    const dangling = traceRuntimeGraph("api/advice.ts").filter((edge) => {
      const target = emittedToSource(
        normalize(join(dirname(edge.file), edge.specifier)),
      );
      return !existsSync(target);
    });
    expect(dangling).toEqual([]);
  });

  test("the traced graph is non-trivial", () => {
    expect(traceRuntimeGraph("api/advice.ts").length).toBeGreaterThan(5);
  });
});
