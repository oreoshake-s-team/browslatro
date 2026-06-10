import { test, expect, type Page } from "@playwright/test";

const HAND_CARDS = '[aria-label="Your hand"] .card';
const SUBMIT_BUTTON = /^Submit Hand/;

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:deterministicBoss", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

async function openDetails(page: Page, text: RegExp): Promise<void> {
  const summary = page.getByText(text).first();
  await expect(summary).toBeVisible();
  const details = summary.locator("xpath=ancestor::details[1]");
  await details.evaluate((el) => {
    (el as HTMLDetailsElement).open = true;
  });
  await expect(details).toHaveAttribute("open", "");
}

async function addJokerById(page: Page, jokerId: string): Promise<void> {
  await openDetails(page, /Apply modifiers/);
  await openDetails(page, /Add a specific Joker/);
  const prev = page.getByTestId("modifier-joker-picker-prev");
  while (!(await prev.isDisabled())) {
    await prev.dispatchEvent("click");
  }
  const tile = page.locator(`button[data-joker-id="${jokerId}"]`);
  const next = page.getByTestId("modifier-joker-picker-next");
  while ((await tile.count()) === 0 && !(await next.isDisabled())) {
    await next.dispatchEvent("click");
  }
  await expect(tile).toBeVisible();
  await tile.dispatchEvent("click");
}

async function seedFullHouseHand(page: Page): Promise<void> {
  await page.evaluate(() => {
    const raw = window.localStorage.getItem("browslatro:run:v1");
    if (!raw) throw new Error("expected a saved snapshot");
    const snapshot = JSON.parse(raw) as {
      state: { dealt?: { hand: unknown; remaining: unknown } };
    };
    if (!snapshot.state.dealt) throw new Error("expected dealt cards");
    snapshot.state.dealt.hand = [
      { id: 9001, rank: "K", suit: "spades" },
      { id: 9002, rank: "K", suit: "hearts" },
      { id: 9003, rank: "K", suit: "diamonds" },
      { id: 9004, rank: "9", suit: "spades" },
      { id: 9005, rank: "9", suit: "hearts" },
      { id: 9006, rank: "2", suit: "clubs" },
      { id: 9007, rank: "4", suit: "clubs" },
      { id: 9008, rank: "6", suit: "clubs" },
    ];
    window.localStorage.setItem("browslatro:run:v1", JSON.stringify(snapshot));
  });
  await page.reload();
}

test("Clever Joker fires when a Full House is played (issue #895)", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
  await addJokerById(page, "clever-joker");
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  await seedFullHouseHand(page);
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  for (let i = 0; i < 5; i += 1) {
    await page.locator(HAND_CARDS).nth(i).click();
  }
  await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
  await expect(page.locator(".scoring-trace")).toContainText("Full House");
  await expect(
    page.locator(".scoring-trace__item", { hasText: "Clever Joker" }).first(),
  ).toBeVisible();
});
