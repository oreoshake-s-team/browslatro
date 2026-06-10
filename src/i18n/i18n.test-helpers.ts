import { act } from "@testing-library/react";
import i18n from "./index";

export async function changeLocaleInAct(locale: string): Promise<void> {
  await act(async () => {
    await i18n.changeLanguage(locale);
  });
}

export async function restoreEnglishLocale(): Promise<void> {
  await changeLocaleInAct("en");
}
