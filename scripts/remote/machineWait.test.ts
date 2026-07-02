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

  test("emits tailed log lines while waiting", async () => {
    const states = ["started", "stopped"];
    let i = 0;
    const batches = [["boot"], ["epoch 1/2", "epoch 2/2"]];
    let poll = 0;
    const lines: string[] = [];
    await waitForMachineTerminal("m1", "created", "job", {
      pollIntervalMs: 1,
      maxWaitMs: 100,
      sleep: async () => {},
      get: async () => ({ state: states[i++] ?? "stopped" }),
      tail: {
        poll: async () => ({ lines: batches[poll++] ?? [], nextToken: String(poll) }),
        onLine: (line) => lines.push(line),
      },
    });
    expect(lines).toEqual(["boot", "epoch 1/2", "epoch 2/2"]);
  });

  test("threads the cursor from one poll into the next", async () => {
    const cursors: string[] = [];
    await waitForMachineTerminal("m1", "started", "job", {
      pollIntervalMs: 1,
      maxWaitMs: 100,
      sleep: async () => {},
      get: async () => ({ state: "stopped" }),
      tail: {
        poll: async (_, nextToken) => {
          cursors.push(nextToken);
          return { lines: [], nextToken: `t${cursors.length}` };
        },
        onLine: () => {},
      },
    });
    expect(cursors).toEqual(["", "t1"]);
  });

  test("flushes remaining logs once the machine is already terminal", async () => {
    const lines: string[] = [];
    await waitForMachineTerminal("m1", "stopped", "job", {
      pollIntervalMs: 1,
      maxWaitMs: 10,
      sleep: async () => {},
      get: async () => ({ state: "stopped" }),
      tail: {
        poll: async () => ({ lines: ["training complete"], nextToken: "t1" }),
        onLine: (line) => lines.push(line),
      },
    });
    expect(lines).toEqual(["training complete"]);
  });

  test("a failed log poll does not abort the wait", async () => {
    const lines: string[] = [];
    await waitForMachineTerminal("m1", "started", "job", {
      pollIntervalMs: 1,
      maxWaitMs: 100,
      sleep: async () => {},
      get: async () => ({ state: "stopped" }),
      tail: {
        poll: async () => {
          throw new Error("logs unavailable");
        },
        onLine: (line) => lines.push(line),
      },
    });
    expect(lines).toEqual(["log tail failed: logs unavailable", "log tail failed: logs unavailable"]);
  });
});
