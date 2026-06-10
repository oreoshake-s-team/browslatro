import { test, expect, type Page } from "@playwright/test";

const HAND_CARDS = '[data-testid="hand-cards"] .card';
const NEW_CARDS = '[data-testid="hand-cards"] .card.card-newly-drawn';
const SUBMIT_BUTTON = /^Submit Hand/;

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

async function startRound(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
}

test("the initial deal has no newly-drawn markers", async ({ page }) => {
  await startRound(page);
  await expect(page.locator(NEW_CARDS)).toHaveCount(0);
});

test("discarding two cards marks exactly the two replacements as newly drawn (#929)", async ({
  page,
}) => {
  await startRound(page);
  const keptLabels = await page
    .locator(HAND_CARDS)
    .evaluateAll((els) =>
      els.slice(2).map((el) => el.getAttribute("aria-label") ?? ""),
    );
  await page.locator(HAND_CARDS).nth(0).click();
  await page.locator(HAND_CARDS).nth(1).click();
  await page.getByRole("button", { name: /^Discard/ }).click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  await expect(page.locator(NEW_CARDS)).toHaveCount(2);
  const newLabels = await page
    .locator(NEW_CARDS)
    .evaluateAll((els) => els.map((el) => el.getAttribute("aria-label") ?? ""));
  for (const label of newLabels) {
    expect(label).toContain("newly drawn");
    expect(keptLabels).not.toContain(label);
  }
});

test("playing a hand marks its replacement as newly drawn (#929)", async ({
  page,
}) => {
  await startRound(page);
  await page.locator(HAND_CARDS).nth(0).click();
  await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  await expect(page.locator(NEW_CARDS)).toHaveCount(1);
});

test("reloading mid-round does not re-mark the last draw as newly drawn (#929)", async ({
  page,
}) => {
  await startRound(page);
  await page.locator(HAND_CARDS).nth(0).click();
  await page.getByRole("button", { name: /^Discard/ }).click();
  await expect(page.locator(NEW_CARDS)).toHaveCount(1);

  await page.reload();

  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  await expect(page.locator(NEW_CARDS)).toHaveCount(0);
});
