// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import {
  clearPlayerKey,
  maskPlayerKey,
  PLAYER_KEY_STORAGE_KEY,
  readStoredPlayerKey,
  storePlayerKey,
} from "./playerKey";

beforeEach(() => {
  window.localStorage.clear();
});

describe("player key storage", () => {
  test("reads null when no key is stored", () => {
    expect(readStoredPlayerKey()).toBeNull();
  });

  test("round-trips a stored key", () => {
    storePlayerKey("sk-ant-api03-example-key");
    expect(readStoredPlayerKey()).toBe("sk-ant-api03-example-key");
  });

  test("trims whitespace on store", () => {
    storePlayerKey("  sk-ant-api03-example-key  ");
    expect(readStoredPlayerKey()).toBe("sk-ant-api03-example-key");
  });

  test("treats a blank stored value as absent", () => {
    window.localStorage.setItem(PLAYER_KEY_STORAGE_KEY, "   ");
    expect(readStoredPlayerKey()).toBeNull();
  });

  test("clear removes the key", () => {
    storePlayerKey("sk-ant-api03-example-key");
    clearPlayerKey();
    expect(readStoredPlayerKey()).toBeNull();
  });
});

describe("maskPlayerKey", () => {
  test("shows the prefix and last four characters", () => {
    expect(maskPlayerKey("sk-ant-api03-abcdefgh1234")).toBe("sk-ant-…1234");
  });

  test("hides almost all of a short key", () => {
    expect(maskPlayerKey("shortkey")).toBe("…ey");
  });
});
