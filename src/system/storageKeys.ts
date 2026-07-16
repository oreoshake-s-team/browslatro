export const STORAGE_KEYS = {
  runSnapshot: "browslatro:run:v1",
  deterministicShuffle: "browslatro:deterministicShuffle",
  devTools: "browslatro:devTools",
  fakeAutopilotPolicy: "browslatro:fakeAutopilotPolicy",
  advisorPlayerKey: "browslatro:advisor-player-key",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
