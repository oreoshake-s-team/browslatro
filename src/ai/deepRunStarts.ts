import type { Joker } from "../items/jokers/types";
import type { HandStats } from "../scoring/handStats";
import type { SeededBuild } from "./exploringStarts";

export interface DeepRunStart {
  readonly ante: number;
  readonly jokers: ReadonlyArray<Joker>;
  readonly handStats: HandStats;
}

export function parseDeepRunStarts(jsonl: string): ReadonlyArray<DeepRunStart> {
  const starts: DeepRunStart[] = [];
  for (const line of jsonl.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const record = JSON.parse(trimmed) as DeepRunStart;
    if (
      !Array.isArray(record.jokers) ||
      typeof record.handStats !== "object" ||
      record.handStats === null
    ) {
      throw new Error(
        "deep-run start record must carry a jokers array and a handStats record",
      );
    }
    starts.push(record);
  }
  if (starts.length === 0) {
    throw new Error("deep-run starts file contains no records");
  }
  return starts;
}

export function deepRunStart(
  starts: ReadonlyArray<DeepRunStart>,
  index: number,
): SeededBuild {
  const wrapped = ((index % starts.length) + starts.length) % starts.length;
  const start = starts[wrapped];
  return { jokers: start.jokers, handStats: start.handStats };
}
