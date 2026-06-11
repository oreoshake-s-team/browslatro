import { applySiteUrl } from "./siteUrl";

describe("applySiteUrl", () => {
  test("replaces every placeholder with the site url", () => {
    expect(applySiteUrl("a %SITE_URL% b %SITE_URL%", "https://x.dev")).toBe(
      "a https://x.dev b https://x.dev",
    );
  });

  test("leaves content without the placeholder unchanged", () => {
    expect(applySiteUrl("no token here", "https://x.dev")).toBe("no token here");
  });

  test("removes every placeholder token", () => {
    expect(
      applySiteUrl("%SITE_URL%/sitemap.xml", "https://x.dev"),
    ).not.toContain("%SITE_URL%");
  });
});
