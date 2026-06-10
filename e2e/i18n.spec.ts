import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

async function startRound(page: Page): Promise<void> {
  await page.goto("/");
  const newRun = page.getByTestId("new-run-confirm");
  if (await newRun.isVisible().catch(() => false)) await newRun.click();
  await page.getByTestId("blind-select-play").click();
}

async function switchLanguage(page: Page, locale: string): Promise<void> {
  await page.getByRole("button", { name: /Options|Nā koho/ }).click();
  await page.getByTestId("options-language").selectOption(locale);
  await page
    .locator(".modal .options-button")
    .last()
    .click();
}

test("switching to Hawaiian translates the sidebar (issue #896)", async ({
  page,
}) => {
  await startRound(page);
  await expect(page.getByText("Money", { exact: true })).toBeVisible();
  await switchLanguage(page, "haw");
  await expect(page.getByText("Kālā", { exact: true })).toBeVisible();
  await expect(page.getByText("Nā lima", { exact: true })).toBeVisible();
  await expect(page.getByText("Money", { exact: true })).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("lang", "haw");
});

test("the Hawaiian locale persists across a reload (issue #896)", async ({
  page,
}) => {
  await startRound(page);
  await switchLanguage(page, "haw");
  await expect(page.getByText("Kālā", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Kālā", { exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "haw");
});

test("switching back to English restores the English sidebar (issue #896)", async ({
  page,
}) => {
  await startRound(page);
  await switchLanguage(page, "haw");
  await expect(page.getByText("Kālā", { exact: true })).toBeVisible();
  await switchLanguage(page, "en");
  await expect(page.getByText("Money", { exact: true })).toBeVisible();
  await expect(page.getByText("Kālā", { exact: true })).toHaveCount(0);
});
