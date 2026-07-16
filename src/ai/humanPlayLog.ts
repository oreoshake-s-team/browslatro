import type { DatasetRecord } from "./dataset";
import type { RunEventRecord } from "./runEvents";

export const HUMAN_PLAY_LOG_KEY = "browslatro.human-play-log.v1";
export const MAX_LOG_RECORDS = 500;
export const HAND_DECISION_KIND = "hand";

export type LoggedRecord = DatasetRecord | RunEventRecord;

export type LogStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface HumanPlayLog {
  append(record: LoggedRecord): boolean;
  count(): number;
  counts(): Readonly<Record<string, number>>;
  toJsonl(): string;
  clear(): void;
}

function lines(storage: LogStorage): string[] {
  const existing = storage.getItem(HUMAN_PLAY_LOG_KEY);
  if (existing === null || existing === "") return [];
  return existing.split("\n");
}

function recordKind(line: string): string {
  try {
    const parsed: unknown = JSON.parse(line);
    if (typeof parsed === "object" && parsed !== null && "kind" in parsed) {
      const kind = (parsed).kind;
      if (typeof kind === "string") return kind;
    }
  } catch {
    return HAND_DECISION_KIND;
  }
  return HAND_DECISION_KIND;
}

export function createHumanPlayLog(storage: LogStorage): HumanPlayLog {
  return {
    append(record) {
      const next = [...lines(storage), JSON.stringify(record)].slice(
        -MAX_LOG_RECORDS,
      );
      try {
        storage.setItem(HUMAN_PLAY_LOG_KEY, next.join("\n"));
        return true;
      } catch {
        return false;
      }
    },
    count() {
      return lines(storage).length;
    },
    counts() {
      const byKind: Record<string, number> = {};
      for (const line of lines(storage)) {
        const kind = recordKind(line);
        byKind[kind] = (byKind[kind] ?? 0) + 1;
      }
      return byKind;
    },
    toJsonl() {
      return storage.getItem(HUMAN_PLAY_LOG_KEY) ?? "";
    },
    clear() {
      storage.removeItem(HUMAN_PLAY_LOG_KEY);
    },
  };
}
