import { useGame } from "../../store/game";
import { play } from "../system/sounds";
import type { PackPool } from "../../items/packs";
import { sortByDisplayName } from "./displayNameSort";

const PACK_POOLS: ReadonlyArray<{ readonly id: PackPool; readonly label: string; readonly icon: string }> = sortByDisplayName(
  [
    { id: "standard", label: "Standard", icon: "🃏" },
    { id: "arcana", label: "Arcana", icon: "🔮" },
    { id: "buffoon", label: "Buffoon", icon: "🎭" },
    { id: "spectral", label: "Spectral", icon: "👻" },
    { id: "celestial", label: "Celestial", icon: "🪐" },
  ],
  (pool) => pool.label,
);

const TILE_CLASS =
  "inline-flex cursor-pointer items-center gap-1 rounded-md border border-solid border-border bg-raised px-2 py-1 text-left text-xs font-semibold text-ink transition-colors enabled:hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-45";

export default function ModifierPackPicker() {
  const setPendingForcedPacks = useGame((s) => s.setPendingForcedPacks);

  function forcePool(pool: PackPool) {
    play("pop");
    setPendingForcedPacks((prev) => [...prev, pool]);
  }

  return (
    <details
      data-testid="modifier-pack-picker"
      className="w-full rounded-lg border border-dashed border-muted/40 bg-white/5 px-3 pb-3 pt-2"
    >
      <summary className="cursor-pointer select-none py-1 text-xs font-bold uppercase tracking-wider text-muted hover:text-ink">
        Force a Pack pool in next shop
      </summary>
      <div className="mt-2 grid grid-cols-5 gap-1">
        {PACK_POOLS.map((pool) => (
          <button
            key={pool.id}
            type="button"
            className={TILE_CLASS}
            data-pack-pool={pool.id}
            data-testid={`force-pack-${pool.id}`}
            onClick={() => forcePool(pool.id)}
          >
            <span aria-hidden="true">{pool.icon} </span>
            {pool.label}
          </button>
        ))}
      </div>
    </details>
  );
}
