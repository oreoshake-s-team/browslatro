// @vitest-environment node
import { describe, expect, test } from "vitest";
import { formatRunId, resolveRunId } from "./runId";

describe("formatRunId", () => {
  test("renders the UTC date and time to second granularity", () => {
    expect(formatRunId(new Date(Date.UTC(2026, 5, 27, 14, 30, 5)))).toBe("2026-06-27-143005");
  });

  test("zero-pads single-digit month, day, and time fields", () => {
    expect(formatRunId(new Date(Date.UTC(2026, 0, 3, 4, 5, 6)))).toBe("2026-01-03-040506");
  });

  test("distinguishes timestamps one second apart", () => {
    const a = formatRunId(new Date(Date.UTC(2026, 5, 27, 14, 30, 5)));
    const b = formatRunId(new Date(Date.UTC(2026, 5, 27, 14, 30, 6)));
    expect(a).not.toBe(b);
  });
});

describe("resolveRunId", () => {
  test("returns an explicit run id unchanged", () => {
    expect(resolveRunId("2026-06-26a", new Date(Date.UTC(2026, 5, 27, 14, 30, 5)))).toBe("2026-06-26a");
  });

  test("falls back to a timestamp run id when the flag is empty", () => {
    expect(resolveRunId("", new Date(Date.UTC(2026, 5, 27, 14, 30, 5)))).toBe("2026-06-27-143005");
  });
});
