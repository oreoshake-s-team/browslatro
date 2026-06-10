// @vitest-environment node
/// <reference types="node" />
import { readFileSync } from "fs";
import { join } from "path";

const indexHtml = readFileSync(join(__dirname, "..", "index.html"), "utf8");
const manifest: unknown = JSON.parse(
  readFileSync(join(__dirname, "..", "public", "manifest.json"), "utf8"),
);

function metaContent(attr: "property" | "name", key: string): string | null {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = indexHtml.match(
    new RegExp(`<meta[^>]*${attr}="${escaped}"[^>]*content="([^"]*)"`, "s"),
  );
  const reversed = indexHtml.match(
    new RegExp(`<meta[^>]*content="([^"]*)"[^>]*${attr}="${escaped}"`, "s"),
  );
  return match?.[1] ?? reversed?.[1] ?? null;
}

describe("Open Graph metadata", () => {
  test("declares the og:type", () => {
    expect(metaContent("property", "og:type")).toBe("website");
  });

  test("declares the og:title", () => {
    expect(metaContent("property", "og:title")).toBe("Browslatro");
  });

  test("matches og:description to the meta description", () => {
    expect(metaContent("property", "og:description")).toBe(
      metaContent("name", "description"),
    );
  });

  test("uses the site URL placeholder for og:url", () => {
    expect(metaContent("property", "og:url")).toBe("%SITE_URL%/");
  });

  test("uses an absolute site URL placeholder for og:image", () => {
    expect(metaContent("property", "og:image")).toBe("%SITE_URL%/logo512.png");
  });

  test("describes the og:image for screen readers", () => {
    expect(metaContent("property", "og:image:alt")).not.toBeNull();
  });
});

describe("Twitter Card metadata", () => {
  test("declares a summary card", () => {
    expect(metaContent("name", "twitter:card")).toBe("summary");
  });

  test("uses an absolute site URL placeholder for twitter:image", () => {
    expect(metaContent("name", "twitter:image")).toBe(
      "%SITE_URL%/logo512.png",
    );
  });
});

describe("web manifest", () => {
  test("declares an app id", () => {
    expect(manifest).toMatchObject({ id: "/" });
  });

  test("declares a description", () => {
    expect(manifest).toMatchObject({
      description: expect.stringContaining("Balatro") as unknown,
    });
  });

  test("keeps standalone display for installability", () => {
    expect(manifest).toMatchObject({ display: "standalone" });
  });
});
