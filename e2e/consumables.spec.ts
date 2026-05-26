import { test, expect, type Page } from "@playwright/test";

const HAND_CARDS = '[aria-label="Your hand"] .card';
const SUBMIT_BUTTON = /^🃏 Submit Hand$/;
const CONTINUE_BUTTON = /Continue/;
const NEXT_ROUND_BUTTON = /Next Round/;
const SHOP_HEADING = /Shop/;

function statValue(page: Page, label: string) {
  return page
    .locator(".stat", { has: page.locator(`.stat-label`, { hasText: label }) })
    .locator(".stat-value");
}

async function moneyOf(page: Page): Promise<number> {
  const txt = await statValue(page, "Money").textContent();
  return Number((txt ?? "$0").replace(/[^0-9-]/g, ""));
}

async function setForcedShopKinds(
  page: Page,
  kinds: ReadonlyArray<string>,
): Promise<void> {
  await page.addInitScript((value) => {
    window.localStorage.setItem("browslatro:deterministicShuffle", "1");
    window.localStorage.setItem("browslatro:muted", "true");
    window.localStorage.setItem("browslatro:forceShopOfferKinds", value);
  }, kinds.join(","));
}

async function buyForcedKindThenLeaveShop(
  page: Page,
  kind: string,
): Promise<void> {
  await page.goto("/");
  await page.getByTestId("blind-select-play").click();
  await expect(page.locator(HAND_CARDS)).toHaveCount(8);
  for (let i = 0; i < 5; i += 1) {
    await page.locator(HAND_CARDS).nth(i).click();
  }
  await page.getByRole("button", { name: SUBMIT_BUTTON }).click();
  await page.getByRole("button", { name: CONTINUE_BUTTON }).click();
  await expect(page.getByRole("heading", { name: SHOP_HEADING })).toBeVisible();
  await page
    .locator(`.shop-offer[data-offer-kind="${kind}"]`)
    .first()
    .locator("button.shop-offer-buy")
    .click();
  await page.getByRole("button", { name: NEXT_ROUND_BUTTON }).click();
  await page.getByTestId("blind-select-play").click();
}

test.describe("Consumables in-game flow (issue #240)", () => {
  test("clicking a planet consumable empties the slot", async ({ page }) => {
    await setForcedShopKinds(page, ["planet", "joker"]);
    await buyForcedKindThenLeaveShop(page, "planet");
    await expect(
      page.locator('[data-consumable-kind="planet"]'),
    ).toHaveCount(1);
    await page.locator('[data-consumable-kind="planet"]').click();
    await expect(
      page.locator('[data-consumable-kind="planet"]'),
    ).toHaveCount(0);
  });

  async function dragConsumableToTarget(
    page: Page,
    sourceSelector: string,
    targetSelector: string,
  ): Promise<void> {
    await page.evaluate(
      async ({ sourceSelector, targetSelector }) => {
        const source = document.querySelector(sourceSelector);
        const target = document.querySelector(targetSelector);
        if (!source || !target) throw new Error("missing drag source or target");
        const store: Record<string, string> = {};
        const types: string[] = [];
        const dt = {
          types,
          effectAllowed: "",
          dropEffect: "",
          setData(format: string, data: string) {
            if (!(format in store)) types.push(format);
            store[format] = data;
          },
          getData(format: string) {
            return store[format] ?? "";
          },
        };
        function dispatch(target: Element, type: string) {
          const event = new Event(type, { bubbles: true, cancelable: true });
          Object.defineProperty(event, "dataTransfer", { value: dt });
          target.dispatchEvent(event);
        }
        function nextFrame(): Promise<void> {
          return new Promise((resolve) => requestAnimationFrame(() => resolve()));
        }
        dispatch(source, "dragstart");
        await nextFrame();
        await nextFrame();
        dispatch(target, "dragover");
        dispatch(target, "drop");
        dispatch(source, "dragend");
      },
      { sourceSelector, targetSelector },
    );
  }

  test("dragging a planet consumable onto the deck pile sells it for $1", async ({
    page,
  }) => {
    await setForcedShopKinds(page, ["planet", "joker"]);
    await buyForcedKindThenLeaveShop(page, "planet");
    const before = await moneyOf(page);
    await dragConsumableToTarget(
      page,
      '[data-consumable-kind="planet"]',
      ".deck-pile",
    );
    expect(await moneyOf(page)).toBe(before + 1);
  });

  test("shift-clicking a consumable sells it for $1", async ({ page }) => {
    await setForcedShopKinds(page, ["planet", "joker"]);
    await buyForcedKindThenLeaveShop(page, "planet");
    const before = await moneyOf(page);
    await page
      .locator('[data-consumable-kind="planet"]')
      .click({ modifiers: ["Shift"] });
    expect(await moneyOf(page)).toBe(before + 1);
  });

  test("dragging a planet consumable onto the jokers area uses it", async ({
    page,
  }) => {
    await setForcedShopKinds(page, ["planet", "joker"]);
    await buyForcedKindThenLeaveShop(page, "planet");
    await dragConsumableToTarget(
      page,
      '[data-consumable-kind="planet"]',
      '[aria-label="Equipped jokers"]',
    );
    await expect(
      page.locator('[data-consumable-kind="planet"]'),
    ).toHaveCount(0);
  });

  test("drag-to-jokers use does not credit the sell value to money", async ({
    page,
  }) => {
    await setForcedShopKinds(page, ["planet", "joker"]);
    await buyForcedKindThenLeaveShop(page, "planet");
    const before = await moneyOf(page);
    await dragConsumableToTarget(
      page,
      '[data-consumable-kind="planet"]',
      '[aria-label="Equipped jokers"]',
    );
    expect(await moneyOf(page)).toBe(before);
  });
});
