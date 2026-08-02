import { useEffect } from "react";
import { scheduleIdleChunkPrefetch } from "../components/system/idleChunkPrefetch";

const CORE_GAMEPLAY_CHUNKS: ReadonlyArray<() => Promise<unknown>> = [
  () => import("../components/shop/Shop"),
  () => import("../components/shop/PackOpenModal"),
  () => import("../components/game/NopeAnimation"),
];

const SECONDARY_CHUNKS: ReadonlyArray<() => Promise<unknown>> = [
  () => import("../components/shop/ShopSuggestion"),
  () => import("../components/shop/PackSuggestion"),
  () => import("../components/game/BlindSelectScreen"),
  () => import("../components/jokers/JokerGrantAcknowledge"),
  () => import("../components/game/RoundWonModal"),
  () => import("../components/game/RoundLostModal"),
  () => import("../components/game/GameWonScreen"),
  () => import("../components/hud/RunInfoDialog"),
  () => import("../components/hud/ScoringTraceModal"),
  () => import("../components/hud/HelpDialog"),
  ...(import.meta.env.VITE_ON_VERCEL === "1"
    ? [
        () => import("@vercel/analytics/react"),
        () => import("@vercel/speed-insights/react"),
      ]
    : []),
];

export function usePrefetchLazyChunks(): void {
  useEffect(() => {
    scheduleIdleChunkPrefetch([...CORE_GAMEPLAY_CHUNKS, ...SECONDARY_CHUNKS]);
  }, []);
}
