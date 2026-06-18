import { test, expect, type Page } from "@playwright/test";

async function dismissBlindSelect(page: Page): Promise<void> {
  const newRun = page.getByTestId("new-run-confirm");
  if (await newRun.isVisible().catch(() => false)) await newRun.click();
  await page.getByTestId("blind-select-play").click();
}

async function openOptions(page: Page) {
  await page.goto("/");
  await page.waitForSelector(".deck-pile");
  await dismissBlindSelect(page);
  await page.getByRole("button", { name: "Options" }).click();
  return page.getByRole("dialog", { name: "Options" });
}

const fontFamilyOf = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => getComputedStyle(el).fontFamily);

test("enabling OpenDyslexic switches UI text but leaves card glyphs in the default font", async ({
  page,
}) => {
  const options = await openOptions(page);
  await options.getByRole("button", { name: "Use OpenDyslexic font" }).click();
  await expect(options.getByRole("button", { name: "Use default font" })).toBeVisible();

  await expect(page.locator("body")).toHaveClass(/dyslexic-font/);
  expect(await fontFamilyOf(page, "body")).toContain("OpenDyslexic");
  await options.getByRole("button", { name: "Close" }).click();
  expect(await fontFamilyOf(page, ".card")).not.toContain("OpenDyslexic");
});

test("the OpenDyslexic choice persists across reloads (negative: off by default)", async ({
  page,
}) => {
  const options = await openOptions(page);
  await expect(page.locator("body")).not.toHaveClass(/dyslexic-font/);
  await options.getByRole("button", { name: "Use OpenDyslexic font" }).click();
  await page.reload();
  await expect(page.locator("body")).toHaveClass(/dyslexic-font/);
});
