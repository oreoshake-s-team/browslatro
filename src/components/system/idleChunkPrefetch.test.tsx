import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { scheduleIdleChunkPrefetch } from "./idleChunkPrefetch";

function setConnection(value: { saveData?: boolean; effectiveType?: string } | undefined) {
  Object.defineProperty(navigator, "connection", {
    value,
    configurable: true,
  });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  delete (window as { requestIdleCallback?: unknown }).requestIdleCallback;
});

afterEach(() => {
  setConnection(undefined);
  vi.useRealTimers();
});

test("skips prefetching when the connection is in save-data mode", async () => {
  setConnection({ saveData: true });
  const importer = vi.fn(() => Promise.resolve());
  scheduleIdleChunkPrefetch([importer]);
  await vi.advanceTimersByTimeAsync(1000);
  expect(importer).not.toHaveBeenCalled();
});

test.each(["2g", "slow-2g"])("skips prefetching when effectiveType is %s", async (effectiveType) => {
  setConnection({ effectiveType });
  const importer = vi.fn(() => Promise.resolve());
  scheduleIdleChunkPrefetch([importer]);
  await vi.advanceTimersByTimeAsync(1000);
  expect(importer).not.toHaveBeenCalled();
});

test("prefetches when the connection is fast", async () => {
  setConnection({ effectiveType: "4g" });
  const importer = vi.fn(() => Promise.resolve());
  scheduleIdleChunkPrefetch([importer]);
  await vi.advanceTimersByTimeAsync(1000);
  expect(importer).toHaveBeenCalledTimes(1);
});

test("prefetches when connection info is unavailable", async () => {
  setConnection(undefined);
  const importer = vi.fn(() => Promise.resolve());
  scheduleIdleChunkPrefetch([importer]);
  await vi.advanceTimersByTimeAsync(1000);
  expect(importer).toHaveBeenCalledTimes(1);
});

test("prefers requestIdleCallback over the setTimeout fallback when available", async () => {
  const requestIdleCallback = vi.fn((cb: IdleRequestCallback) => {
    cb({ didTimeout: false, timeRemaining: () => 50 });
    return 0;
  });
  (window as { requestIdleCallback: unknown }).requestIdleCallback = requestIdleCallback;
  const importer = vi.fn(() => Promise.resolve());
  scheduleIdleChunkPrefetch([importer]);
  await vi.advanceTimersByTimeAsync(0);
  expect(requestIdleCallback).toHaveBeenCalled();
});

test("does not start the next chunk until the previous one settles", async () => {
  let resolveFirst: (() => void) | undefined;
  const first = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        resolveFirst = resolve;
      }),
  );
  const second = vi.fn(() => Promise.resolve());
  scheduleIdleChunkPrefetch([first, second]);
  await vi.advanceTimersByTimeAsync(1000);
  expect(second).not.toHaveBeenCalled();
  resolveFirst?.();
  await vi.advanceTimersByTimeAsync(1000);
  expect(second).toHaveBeenCalledTimes(1);
});

test("continues to the next chunk even when an earlier import rejects", async () => {
  const failing = vi.fn(() => Promise.reject(new Error("network error")));
  const next = vi.fn(() => Promise.resolve());
  scheduleIdleChunkPrefetch([failing, next]);
  await vi.advanceTimersByTimeAsync(1000);
  expect(next).toHaveBeenCalledTimes(1);
});
