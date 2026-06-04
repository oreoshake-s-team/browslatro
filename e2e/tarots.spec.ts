import { test, expect, type Page } from "@playwright/test";

const HAND_CARDS = '[aria-label="Your hand"] .card';

async function setDeterministic(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:muted", "true");
  });
}

async function openDetails(page: Page, text: RegExp): Promise<void> {
  const summary = page.getByText(text).first();
  const detailsOpen = await summary
    .locator("xpath=ancestor::details[1]")
    .evaluate((el) => el.hasAttribute("open"));
  if (!detailsOpen) await summary.click();
}

async function addTarotToTray(page: Page, tarotId: string): Promise<void> {
  await openDetails(page, /Apply modifiers/);
  await openDetails(page, /Add a specific Tarot/);
  await page.locator(`button[data-tarot-id="${tarotId}"]`).click();
}

async function startRound(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByTestId("new-run-confirm").click();
}

async function enterRoundWithTarot(
  page: Page,
  tarotId: string,
): Promise<void> {
  await startRound(page);
  await addTarotToTray(page, tarotId);
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
}

function tarotTile(page: Page) {
  return page.locator('[data-consumable-kind="tarot"]').first();
}

function handCardAt(page: Page, index: number) {
  return page.locator(HAND_CARDS).nth(index);
}

test.describe("Tarots in-hand (#696)", () => {
  test.beforeEach(async ({ page }) => {
    await setDeterministic(page);
  });

  test("The Hanged Man: selecting 1 hand card and clicking the tarot removes that card from the hand", async ({
    page,
  }) => {
    await enterRoundWithTarot(page, "the-hanged-man");
    await handCardAt(page, 0).click();
    await tarotTile(page).click();
    await expect(page.locator(HAND_CARDS)).toHaveCount(7);
  });

  test("Strength: selecting a hand card and clicking the tarot increases its rank by 1", async ({
    page,
  }) => {
    await enterRoundWithTarot(page, "strength");
    const target = handCardAt(page, 0);
    const rankBefore =
      (await target.locator(".card-rank").first().textContent()) ?? "";
    await target.click();
    await tarotTile(page).click();
    const rankAfter =
      (await handCardAt(page, 0).locator(".card-rank").first().textContent()) ??
      "";
    expect(rankAfter).not.toBe(rankBefore);
  });

  test("The Lovers: selecting a hand card and clicking the tarot applies the wild enhancement", async ({
    page,
  }) => {
    await enterRoundWithTarot(page, "the-lovers");
    await handCardAt(page, 0).click();
    await tarotTile(page).click();
    await expect(
      page.locator(`${HAND_CARDS}.card-enhancement-wild`),
    ).toHaveCount(1);
  });

  test("The Sun: selecting a hand card and clicking the tarot converts that card to hearts (#692 in-hand path)", async ({
    page,
  }) => {
    await enterRoundWithTarot(page, "the-sun");
    await handCardAt(page, 0).click();
    await tarotTile(page).click();
    await expect(
      page.locator(`${HAND_CARDS}.card-suit-hearts`).first(),
    ).toBeVisible();
  });

  test("The Hermit: clicking the tarot doubles money (capped per HERMIT_MONEY_CAP)", async ({
    page,
  }) => {
    await enterRoundWithTarot(page, "the-hermit");
    const moneyValue = page
      .locator(".stat", {
        has: page.locator(".stat-label", { hasText: "Money" }),
      })
      .locator(".stat-value");
    const before = Number(
      ((await moneyValue.textContent()) ?? "$0").replace(/[^0-9-]/g, ""),
    );
    await tarotTile(page).click();
    const after = Number(
      ((await moneyValue.textContent()) ?? "$0").replace(/[^0-9-]/g, ""),
    );
    expect(after).toBeGreaterThan(before);
  });

  test("The Hanged Man with no card selected is a no-op (consumable stays in tray) — negative", async ({
    page,
  }) => {
    await enterRoundWithTarot(page, "the-hanged-man");
    await tarotTile(page).click();
    await expect(page.locator('[data-consumable-kind="tarot"]')).toHaveCount(1);
  });
});
