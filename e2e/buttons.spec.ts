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

test("Submit Hand renders as the primary (green) variant", async ({
  page,
}) => {
  await startRound(page);
  await page.mouse.move(0, 0);
  const submit = page.getByRole("button", { name: /^Submit Hand/ });
  await expect(submit).toHaveClass(/btn--primary/);
  const bg = await submit.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe("rgb(81, 207, 102)");
});

test("Discard renders as the neutral secondary variant", async ({
  page,
}) => {
  await startRound(page);
  const card = page.locator('[data-testid="hand-cards"] .card').first();
  await card.click();
  await page.mouse.move(0, 0);
  const discard = page.getByRole("button", { name: /Discard/ });
  await expect(discard).toBeEnabled();
  await expect(discard).toHaveClass(/btn--secondary/);
  const bg = await discard.evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe("rgb(35, 43, 63)");
});

test("the blind-select Play button uses the shared focus ring token", async ({
  page,
}) => {
  await page.goto("/");
  const newRun = page.getByTestId("new-run-confirm");
  if (await newRun.isVisible().catch(() => false)) await newRun.click();
  const play = page.getByTestId("blind-select-play");
  await play.focus();
  const outlineColor = await play.evaluate(
    (el) => getComputedStyle(el).outlineColor,
  );
  expect(outlineColor).toBe("rgb(116, 192, 252)");
});
