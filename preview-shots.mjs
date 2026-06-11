import { chromium } from "@playwright/test";

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const page = await browser.newPage({
  viewport: { width: 1180, height: 1000 },
  deviceScaleFactor: 2,
});
page.on("console", (m) => { if (m.type() === "error") console.error("PAGE:", m.text()); });
page.on("pageerror", (e) => console.error("PAGEERROR:", e.message));
await page.goto("http://127.0.0.1:3000/preview.html", { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
for (const id of ["preview-1159", "preview-1160", "preview-1161"]) {
  await page.locator(`#${id}`).screenshot({ path: `/tmp/${id}.png` });
  console.log("captured", id);
}
await browser.close();
