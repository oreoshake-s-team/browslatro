import i18n from "./index";
import { haw } from "./locales/haw";

describe("lazy locale loading", () => {
  test("does not register haw resources at init", () => {
    expect(i18n.hasResourceBundle("haw", "translation")).toBe(false);
  });

  test("loads haw resources on demand via changeLanguage", async () => {
    await i18n.changeLanguage("haw");
    expect(i18n.hasResourceBundle("haw", "translation")).toBe(true);
  });

  test("translates with the haw bundle after the lazy load", async () => {
    await i18n.changeLanguage("haw");
    expect(i18n.t("app.titleMenu")).toBe(haw.app.titleMenu);
  });

  test("keeps serving en after switching back", async () => {
    await i18n.changeLanguage("haw");
    await i18n.changeLanguage("en");
    expect(i18n.language).toBe("en");
  });
});
