// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import { runPreflight } from "./preflight";

describe("runPreflight", () => {
  test("passes when both checks succeed", async () => {
    await expect(
      runPreflight("run1", {
        putMarker: async () => {},
        checkFly: async () => {},
      }),
    ).resolves.toBeUndefined();
  });

  test("writes the marker under a run-scoped key", async () => {
    const putMarker = vi.fn(async () => {});
    await runPreflight("run1", { putMarker, checkFly: async () => {} });
    expect(putMarker).toHaveBeenCalledWith("preflight/run1.marker", expect.any(Buffer));
  });

  test("does not launch when the Fly check fails", async () => {
    await expect(
      runPreflight("run1", {
        putMarker: async () => {},
        checkFly: async () => {
          throw new Error("app not found");
        },
      }),
    ).rejects.toThrow(/Fly app reachable: app not found/);
  });

  test("reports the S3 failure when the bucket is not writable", async () => {
    await expect(
      runPreflight("run1", {
        putMarker: async () => {
          throw new Error("403 Forbidden");
        },
        checkFly: async () => {},
      }),
    ).rejects.toThrow(/S3 bucket writable: 403 Forbidden/);
  });

  test("aggregates every failure into one error", async () => {
    await expect(
      runPreflight("run1", {
        putMarker: async () => {
          throw new Error("bad bucket");
        },
        checkFly: async () => {
          throw new Error("bad token");
        },
      }),
    ).rejects.toThrow(/bad token[\s\S]*bad bucket/);
  });
});
