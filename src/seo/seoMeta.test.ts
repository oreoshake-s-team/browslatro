/// <reference types="node" />
import { readFileSync } from "fs";
import { join } from "path";
import { SUPPORTED_LOCALES } from "../i18n";
import { applySiteUrl } from "./siteUrl";

const root = join(__dirname, "..", "..");
const indexHtml = readFileSync(join(root, "index.html"), "utf8");
const robots = readFileSync(join(root, "public", "robots.txt"), "utf8");
const sitemap = readFileSync(join(root, "public", "sitemap.xml"), "utf8");

function jsonLd(html: string): Record<string, unknown> {
  const match = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  );
  if (!match) throw new Error("no JSON-LD block found");
  return JSON.parse(match[1]) as Record<string, unknown>;
}

describe("index.html SEO head", () => {
  test("declares a canonical url", () => {
    expect(indexHtml).toContain('<link rel="canonical" href="%SITE_URL%/" />');
  });

  test("uses the large summary card for Twitter", () => {
    expect(indexHtml).toContain(
      'name="twitter:card" content="summary_large_image"',
    );
  });

  test("provides alt text for the Twitter image", () => {
    expect(indexHtml).toContain('name="twitter:image:alt"');
  });

  test("declares the primary Open Graph locale", () => {
    expect(indexHtml).toContain('property="og:locale" content="en_US"');
  });

  test("declares an og:locale:alternate for every non-default locale", () => {
    const present = SUPPORTED_LOCALES.filter((locale) => locale !== "en").every(
      (locale) =>
        indexHtml.includes(
          `property="og:locale:alternate" content="${locale}"`,
        ),
    );
    expect(present).toBe(true);
  });

  test("sets a descriptive page title", () => {
    expect(indexHtml).toMatch(/<title>Browslatro — .+<\/title>/);
  });
});

describe("index.html structured data", () => {
  test("embeds a parseable JSON-LD block", () => {
    expect(() => jsonLd(indexHtml)).not.toThrow();
  });

  test("describes the app as a VideoGame", () => {
    expect(jsonLd(indexHtml)["@type"]).toBe("VideoGame");
  });

  test("lists every supported language", () => {
    expect(jsonLd(indexHtml).inLanguage).toEqual([...SUPPORTED_LOCALES]);
  });
});

describe("crawler files", () => {
  test("robots points at the sitemap", () => {
    expect(robots).toContain("Sitemap: %SITE_URL%/sitemap.xml");
  });

  test("sitemap is a urlset", () => {
    expect(sitemap).toContain("<urlset");
  });

  test("sitemap lists the site root", () => {
    expect(sitemap).toContain("<loc>%SITE_URL%/</loc>");
  });
});

describe("site url substitution", () => {
  test("leaves no placeholder in index.html after substitution", () => {
    expect(applySiteUrl(indexHtml, "https://x.dev")).not.toContain("%SITE_URL%");
  });

  test("leaves no placeholder in robots.txt after substitution", () => {
    expect(applySiteUrl(robots, "https://x.dev")).not.toContain("%SITE_URL%");
  });

  test("leaves no placeholder in sitemap.xml after substitution", () => {
    expect(applySiteUrl(sitemap, "https://x.dev")).not.toContain("%SITE_URL%");
  });
});
