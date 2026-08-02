import { test, expect } from "@playwright/test";

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    window.localStorage.setItem("browslatro:muted", "true");
  });
});

test("the app shell renders with the dark background token", async ({
  page,
}) => {
  await page.goto("/");
  const bodyBg = await page.evaluate(
    () => getComputedStyle(document.body).backgroundColor,
  );
  expect(bodyBg).toBe("rgb(14, 17, 24)");
});

test("the sidebar renders on the dark surface token", async ({
  page,
}) => {
  await page.goto("/");
  const sidebarBg = await page
    .locator('[data-testid="sidebar"]')
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(sidebarBg).toBe("rgb(23, 28, 40)");
});
