import { renderHook } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import { scheduleIdleChunkPrefetch } from "../components/system/idleChunkPrefetch";
import { usePrefetchLazyChunks } from "./usePrefetchLazyChunks";

vi.mock("../components/system/idleChunkPrefetch", () => ({
  scheduleIdleChunkPrefetch: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

test("schedules a prefetch of the lazy chunk queue on mount", () => {
  renderHook(() => usePrefetchLazyChunks());
  expect(scheduleIdleChunkPrefetch).toHaveBeenCalledTimes(1);
});

test("does not reschedule on re-render", () => {
  const { rerender } = renderHook(() => usePrefetchLazyChunks());
  rerender();
  rerender();
  expect(scheduleIdleChunkPrefetch).toHaveBeenCalledTimes(1);
});
