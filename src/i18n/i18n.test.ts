import { detectLocale, isLocale } from "./index";
import { en } from "./locales/en";
import { haw } from "./locales/haw";

function flattenKeys(messages: Record<string, Record<string, string>>): string[] {
  return Object.entries(messages)
    .flatMap(([section, entries]) =>
      Object.keys(entries).map((key) => `${section}.${key}`),
    )
    .sort();
}

function placeholders(value: string): string[] {
  return (value.match(/\{\{\w+\}\}/g) ?? []).sort();
}

describe("isLocale", () => {
  test("accepts en", () => {
    expect(isLocale("en")).toBe(true);
  });

  test("accepts haw", () => {
    expect(isLocale("haw")).toBe(true);
  });

  test("rejects an unsupported locale", () => {
    expect(isLocale("fr")).toBe(false);
  });

  test("rejects null", () => {
    expect(isLocale(null)).toBe(false);
  });
});

describe("detectLocale", () => {
  test("falls back to en without a window", () => {
    expect(detectLocale()).toBe("en");
  });
});

describe("haw locale", () => {
  test("covers every en key", () => {
    expect(flattenKeys(haw)).toEqual(flattenKeys(en));
  });

  test("preserves every interpolation placeholder", () => {
    const enRecord: Record<string, Record<string, string>> = en;
    const hawRecord: Record<string, Record<string, string>> = haw;
    const mismatches = Object.entries(enRecord).flatMap(([section, entries]) =>
      Object.entries(entries)
        .filter(
          ([key, value]) =>
            placeholders(value).join(",") !==
            placeholders(hawRecord[section][key]).join(","),
        )
        .map(([key]) => `${section}.${key}`),
    );
    expect(mismatches).toEqual([]);
  });

  test("has no empty translations", () => {
    const empty = Object.entries(haw).flatMap(([section, entries]) =>
      Object.entries(entries)
        .filter(([, value]) => value.trim() === "")
        .map(([key]) => `${section}.${key}`),
    );
    expect(empty).toEqual([]);
  });
});
