// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test, vi } from "vitest";

const ROOT = join(__dirname, "..", "..");
const SW_SOURCE = readFileSync(join(ROOT, "public", "sw.js"), "utf8");

interface VercelHeader {
  readonly key: string;
  readonly value: string;
}
interface VercelHeaderRule {
  readonly source: string;
  readonly headers: ReadonlyArray<VercelHeader>;
}
interface VercelConfig {
  readonly headers: ReadonlyArray<VercelHeaderRule>;
}

function loadVercelConfig(): VercelConfig {
  return JSON.parse(
    readFileSync(join(ROOT, "vercel.json"), "utf8"),
  ) as VercelConfig;
}

function cacheControlFor(source: string): string {
  const rule = loadVercelConfig().headers.find((r) => r.source === source);
  if (rule === undefined) throw new Error(`no header rule for ${source}`);
  const header = rule.headers.find((h) => h.key === "Cache-Control");
  if (header === undefined) throw new Error(`no Cache-Control for ${source}`);
  return header.value;
}

interface SwClient {
  readonly url: string;
  navigate(url: string): Promise<void>;
}

interface SwHarness {
  readonly listeners: Map<string, (event: { waitUntil(p: Promise<unknown>): void }) => void>;
  readonly deletedCaches: string[];
  readonly navigated: string[];
  readonly skipWaiting: ReturnType<typeof vi.fn>;
  readonly unregister: ReturnType<typeof vi.fn>;
}

function loadServiceWorker(): SwHarness {
  const listeners = new Map<
    string,
    (event: { waitUntil(p: Promise<unknown>): void }) => void
  >();
  const deletedCaches: string[] = [];
  const navigated: string[] = [];
  const skipWaiting = vi.fn();
  const unregister = vi.fn(() => Promise.resolve(true));

  const clients: ReadonlyArray<SwClient> = [
    {
      url: "https://browslatro.example/",
      navigate: (url: string) => {
        navigated.push(url);
        return Promise.resolve();
      },
    },
  ];

  const self = {
    addEventListener: (
      type: string,
      handler: (event: { waitUntil(p: Promise<unknown>): void }) => void,
    ) => {
      listeners.set(type, handler);
    },
    skipWaiting,
    registration: { unregister },
    clients: { matchAll: () => Promise.resolve(clients) },
  };
  const caches = {
    keys: () => Promise.resolve(["workbox-precache-v1", "runtime-assets"]),
    delete: (key: string) => {
      deletedCaches.push(key);
      return Promise.resolve(true);
    },
  };

  const factory = new Function("self", "caches", SW_SOURCE) as (
    self: unknown,
    caches: unknown,
  ) => void;
  factory(self, caches);

  return { listeners, deletedCaches, navigated, skipWaiting, unregister };
}

async function runActivate(harness: SwHarness): Promise<void> {
  const handler = harness.listeners.get("activate");
  if (handler === undefined) throw new Error("no activate listener registered");
  let waited: Promise<unknown> = Promise.resolve();
  handler({
    waitUntil: (p: Promise<unknown>) => {
      waited = p;
    },
  });
  await waited;
}

describe("service worker kill-switch", () => {
  test("takes over immediately on install", () => {
    const harness = loadServiceWorker();
    harness.listeners.get("install")?.({ waitUntil: () => {} });
    expect(harness.skipWaiting).toHaveBeenCalledTimes(1);
  });

  test("deletes every existing cache on activate", async () => {
    const harness = loadServiceWorker();
    await runActivate(harness);
    expect(harness.deletedCaches).toEqual([
      "workbox-precache-v1",
      "runtime-assets",
    ]);
  });

  test("unregisters itself on activate", async () => {
    const harness = loadServiceWorker();
    await runActivate(harness);
    expect(harness.unregister).toHaveBeenCalledTimes(1);
  });

  test("reloads controlled windows so they refetch from the network", async () => {
    const harness = loadServiceWorker();
    await runActivate(harness);
    expect(harness.navigated).toEqual(["https://browslatro.example/"]);
  });
});

describe("vercel cache headers", () => {
  test("content-hashed assets are immutable", () => {
    expect(cacheControlFor("/assets/(.*)")).toBe(
      "public, max-age=31536000, immutable",
    );
  });

  test("versioned model files are immutable", () => {
    expect(cacheControlFor("/models/(.*)")).toBe(
      "public, max-age=31536000, immutable",
    );
  });

  test("the kill-switch script is always revalidated", () => {
    expect(cacheControlFor("/sw.js")).toBe("public, max-age=0, must-revalidate");
  });

  test("the html entry point is always revalidated", () => {
    expect(cacheControlFor("/(index.html)?")).toBe(
      "public, max-age=0, must-revalidate",
    );
  });
});
