import { localizedContentString, registerLocaleContent } from "./localeContent";
import { haw } from "./locales/haw";

describe("localeContent", () => {
  test("resolves en content without any registration", () => {
    expect(localizedContentString("en", "planetNames", "venus", "fallback")).toBe("Venus");
  });

  test("falls back to the English text while a locale is not yet loaded", () => {
    expect(localizedContentString("haw", "planetNames", "venus", "fallback")).toBe("Venus");
  });

  test("serves the native text once the locale content is registered", () => {
    registerLocaleContent("haw", haw);
    expect(localizedContentString("haw", "planetNames", "venus", "fallback")).toBe(
      "Hōkūloa",
    );
  });

  test("falls back per id to the English text for a registered locale", () => {
    registerLocaleContent("haw", haw);
    expect(localizedContentString("haw", "planetNames", "pluto", "fallback")).toBe(
      "Pluto",
    );
  });

  test("returns the fallback when no locale knows the id", () => {
    registerLocaleContent("haw", haw);
    expect(localizedContentString("haw", "planetNames", "not-a-planet", "Fallback")).toBe(
      "Fallback",
    );
  });
});
