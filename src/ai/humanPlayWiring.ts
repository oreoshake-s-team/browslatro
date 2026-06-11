import type { GameState } from "../store/game";
import { toModelStateInput, toSimulatePlayInput } from "./advisor/snapshot";
import type { AgentAction } from "./headlessRun";
import { recordHumanDecision } from "./humanPlay";
import { buildRunEventRecord, type RunEvent } from "./runEvents";
import { createHumanPlayLog, type HumanPlayLog } from "./humanPlayLog";

let sharedLog: HumanPlayLog | null = null;

export function humanPlayLog(): HumanPlayLog {
  sharedLog = sharedLog ?? createHumanPlayLog(window.localStorage);
  return sharedLog;
}

let sessionSeed: number | null = null;

function currentSessionSeed(): number {
  sessionSeed = sessionSeed ?? Math.floor(Math.random() * 2_147_483_647);
  return sessionSeed;
}

let recordingSuppressed = false;

export function setHumanPlayRecordingSuppressed(suppressed: boolean): void {
  recordingSuppressed = suppressed;
}

export interface CaptureDeps {
  readonly log: HumanPlayLog;
  readonly seed: number;
}

export function captureHumanDecision(
  state: GameState,
  action: AgentAction,
  deps?: CaptureDeps,
): boolean {
  if (recordingSuppressed) return false;
  try {
    const record = recordHumanDecision(
      { ...toSimulatePlayInput(state), ...toModelStateInput(state) },
      action,
      deps?.seed ?? currentSessionSeed(),
    );
    if (record === null) return false;
    return (deps?.log ?? humanPlayLog()).append(record);
  } catch {
    return false;
  }
}

export function captureRunEvent(
  state: GameState,
  event: RunEvent,
  deps?: CaptureDeps,
): boolean {
  if (recordingSuppressed) return false;
  try {
    const record = buildRunEventRecord(
      state,
      deps?.seed ?? currentSessionSeed(),
      event,
    );
    return (deps?.log ?? humanPlayLog()).append(record);
  } catch {
    return false;
  }
}
