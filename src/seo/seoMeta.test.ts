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

function seoShell(html: string): string {
  const match = html.match(/<main data-seo-shell[^>]*>([\s\S]*?)<\/main>/);
  if (!match) throw new Error("no SEO shell found");
  return match[1];
}

describe("crawler loading shell", () => {
  test("ships a static SEO shell for non-JS crawlers", () => {
    expect(indexHtml).toContain("data-seo-shell");
  });

  test("the shell lives outside #root so hydration cannot clobber it", () => {
    expect(indexHtml).toMatch(/<\/main>\s*<div id="root"><\/div>/);
  });

  test("the shell is marked busy while the app loads", () => {
    expect(indexHtml).toMatch(/<main data-seo-shell aria-busy="true">/);
  });

  test("the shell announces loading via a status live region", () => {
    expect(seoShell(indexHtml)).toMatch(
      /<p role="status" data-seo-shell-status>Loading…<\/p>/,
    );
  });

  test("the shell exposes an h1 naming the game", () => {
    expect(seoShell(indexHtml)).toMatch(/<h1>Browslatro[^<]*<\/h1>/);
  });

  test("the shell lists gameplay features", () => {
    expect(seoShell(indexHtml)).toContain("<li>");
  });

  test("the shell links to the source repository", () => {
    expect(seoShell(indexHtml)).toContain(
      'href="https://github.com/oreoshake-s-team/browslatro"',
    );
  });

  test("the shell links to a how-to-play guide", () => {
    expect(seoShell(indexHtml)).toContain("balatrowiki.org");
  });

  test("the pulse animation is disabled under reduced motion", () => {
    const reducedMotion = indexHtml.match(
      /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n {6}\}/,
    );
    expect(reducedMotion?.[0]).toContain("animation: none");
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
