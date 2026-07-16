// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import { backoffDelayMs, fetchWithRetry } from "./fetchRetry";

const noSleep = (): Promise<void> => Promise.resolve();

function response(status: number): Response {
  return new Response(status === 204 ? null : "body", { status });
}

function connectTimeout(): Error {
  const error = new TypeError("fetch failed");
  (error as { cause?: unknown }).cause = { code: "UND_ERR_CONNECT_TIMEOUT" };
  return error;
}

describe("fetchWithRetry", () => {
  test("returns a 2xx response without retrying", async () => {
    const impl = vi.fn().mockResolvedValue(response(200));
    await fetchWithRetry(impl, "u", undefined, { sleep: noSleep });
    expect(impl).toHaveBeenCalledTimes(1);
  });

  test("retries a thrown connect timeout then succeeds", async () => {
    const impl = vi
      .fn()
      .mockRejectedValueOnce(connectTimeout())
      .mockRejectedValueOnce(connectTimeout())
      .mockResolvedValue(response(200));
    const res = await fetchWithRetry(impl, "u", undefined, { sleep: noSleep });
    expect([impl.mock.calls.length, res.status]).toEqual([3, 200]);
  });

  test("retries a 500 response then returns the eventual 200", async () => {
    const impl = vi.fn().mockResolvedValueOnce(response(500)).mockResolvedValue(response(200));
    const res = await fetchWithRetry(impl, "u", undefined, { sleep: noSleep });
    expect(res.status).toBe(200);
  });

  test("retries a 429 response", async () => {
    const impl = vi.fn().mockResolvedValueOnce(response(429)).mockResolvedValue(response(200));
    await fetchWithRetry(impl, "u", undefined, { sleep: noSleep });
    expect(impl).toHaveBeenCalledTimes(2);
  });

  test("does not retry a 404 (negative)", async () => {
    const impl = vi.fn().mockResolvedValue(response(404));
    const res = await fetchWithRetry(impl, "u", undefined, { sleep: noSleep });
    expect([impl.mock.calls.length, res.status]).toEqual([1, 404]);
  });

  test("returns the last retryable response after exhausting retries", async () => {
    const impl = vi.fn().mockResolvedValue(response(503));
    const res = await fetchWithRetry(impl, "u", undefined, {
      retries: 2,
      sleep: noSleep,
    });
    expect([impl.mock.calls.length, res.status]).toEqual([3, 503]);
  });

  test("throws the last error when every attempt is a network error", async () => {
    const impl = vi.fn().mockRejectedValue(connectTimeout());
    await expect(
      fetchWithRetry(impl as unknown as typeof fetch, "u", undefined, { retries: 2, sleep: noSleep }),
    ).rejects.toThrow("fetch failed");
  });

  test("reports the transient reason to onRetry", async () => {
    const reasons: string[] = [];
    const impl = vi.fn().mockRejectedValueOnce(connectTimeout()).mockResolvedValue(response(200));
    await fetchWithRetry(impl, "u", undefined, {
      sleep: noSleep,
      onRetry: (_attempt, reason) => reasons.push(reason),
    });
    expect(reasons).toEqual(["UND_ERR_CONNECT_TIMEOUT"]);
  });
});

describe("backoffDelayMs", () => {
  test("grows exponentially from the base delay", () => {
    expect(backoffDelayMs(3, 500, 100_000, () => 1)).toBe(4000);
  });

  test("caps at the maximum delay", () => {
    expect(backoffDelayMs(20, 500, 10_000, () => 1)).toBe(10_000);
  });

  test("applies jitter in the [0.5, 1] band of the exponential", () => {
    expect(backoffDelayMs(1, 500, 100_000, () => 0)).toBe(500);
  });
});
