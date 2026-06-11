import { serializeDatasetRecords, type DatasetRecord } from "./dataset";

export const HUMAN_PLAY_LOG_KEY = "browslatro.human-play-log.v1";

export type LogStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface HumanPlayLog {
  append(record: DatasetRecord): boolean;
  count(): number;
  toJsonl(): string;
  clear(): void;
}

export function createHumanPlayLog(storage: LogStorage): HumanPlayLog {
  return {
    append(record) {
      const line = serializeDatasetRecords([record]);
      const existing = storage.getItem(HUMAN_PLAY_LOG_KEY);
      const next = existing === null || existing === "" ? line : `${existing}\n${line}`;
      try {
        storage.setItem(HUMAN_PLAY_LOG_KEY, next);
        return true;
      } catch {
        return false;
      }
    },
    count() {
      const existing = storage.getItem(HUMAN_PLAY_LOG_KEY);
      if (existing === null || existing === "") return 0;
      return existing.split("\n").length;
    },
    toJsonl() {
      return storage.getItem(HUMAN_PLAY_LOG_KEY) ?? "";
    },
    clear() {
      storage.removeItem(HUMAN_PLAY_LOG_KEY);
    },
  };
}
