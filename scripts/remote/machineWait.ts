import type { LogPollResult } from "./flyLogs";

export const TERMINAL_MACHINE_STATES = new Set(["stopped", "destroyed"]);

export interface MachineLogTail {
  readonly poll: (machineId: string, nextToken: string) => Promise<LogPollResult>;
  readonly onLine: (line: string) => void;
}

export interface MachineWaitOptions {
  readonly pollIntervalMs: number;
  readonly maxWaitMs: number;
  readonly sleep: (ms: number) => Promise<void>;
  readonly get: (id: string) => Promise<{ readonly state: string }>;
  readonly tail?: MachineLogTail;
}

export async function waitForMachineTerminal(
  id: string,
  startState: string,
  label: string,
  options: MachineWaitOptions,
): Promise<void> {
  let waited = 0;
  let state = startState;
  let cursor = "";
  const tail = options.tail;
  const drainLogs = async (): Promise<void> => {
    if (tail === undefined) return;
    try {
      const result = await tail.poll(id, cursor);
      cursor = result.nextToken;
      for (const line of result.lines) {
        tail.onLine(line);
      }
    } catch (error) {
      tail.onLine(`log tail failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  while (!TERMINAL_MACHINE_STATES.has(state)) {
    if (waited >= options.maxWaitMs) {
      throw new Error(
        `machine ${id} for ${label} did not finish within ${options.maxWaitMs}ms (last state "${state}")`,
      );
    }
    await options.sleep(options.pollIntervalMs);
    waited += options.pollIntervalMs;
    await drainLogs();
    state = (await options.get(id)).state;
  }
  await drainLogs();
}
