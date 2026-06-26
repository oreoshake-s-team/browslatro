export const TERMINAL_MACHINE_STATES = new Set(["stopped", "destroyed"]);

export interface MachineWaitOptions {
  readonly pollIntervalMs: number;
  readonly maxWaitMs: number;
  readonly sleep: (ms: number) => Promise<void>;
  readonly get: (id: string) => Promise<{ readonly state: string }>;
}

export async function waitForMachineTerminal(
  id: string,
  startState: string,
  label: string,
  options: MachineWaitOptions,
): Promise<void> {
  let waited = 0;
  let state = startState;
  while (!TERMINAL_MACHINE_STATES.has(state)) {
    if (waited >= options.maxWaitMs) {
      throw new Error(
        `machine ${id} for ${label} did not finish within ${options.maxWaitMs}ms (last state "${state}")`,
      );
    }
    await options.sleep(options.pollIntervalMs);
    waited += options.pollIntervalMs;
    state = (await options.get(id)).state;
  }
}
