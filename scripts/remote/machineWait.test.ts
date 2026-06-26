// @vitest-environment node
import { describe, expect, test, vi } from "vitest";
import { waitForMachineTerminal } from "./machineWait";

describe("waitForMachineTerminal", () => {
  test("returns immediately when the start state is already terminal", async () => {
    const get = vi.fn();
    await waitForMachineTerminal("m1", "stopped", "job", {
      pollIntervalMs: 1,
      maxWaitMs: 10,
      sleep: async () => {},
      get,
    });
    expect(get).not.toHaveBeenCalled();
  });

  test("polls until the machine reaches a terminal state", async () => {
    const states = ["started", "stopping", "stopped"];
    let i = 0;
    const get = vi.fn(async () => ({ state: states[i++] ?? "stopped" }));
    await waitForMachineTerminal("m1", "created", "job", {
      pollIntervalMs: 1,
      maxWaitMs: 100,
      sleep: async () => {},
      get,
    });
    expect(get).toHaveBeenCalledTimes(3);
  });

  test("throws when the machine never reaches a terminal state", async () => {
    await expect(
      waitForMachineTerminal("m1", "started", "job", {
        pollIntervalMs: 2,
        maxWaitMs: 4,
        sleep: async () => {},
        get: async () => ({ state: "started" }),
      }),
    ).rejects.toThrow(/did not finish within 4ms/);
  });
});
