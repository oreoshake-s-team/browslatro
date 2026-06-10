import "./ModifierPackPicker.css";
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

export default function ModifierPackPicker() {
  const setPendingForcedPacks = useGame((s) => s.setPendingForcedPacks);

  function forcePool(pool: PackPool) {
    play("pop");
    setPendingForcedPacks((prev) => [...prev, pool]);
  }

  return (
    <details className="modifier-pack-picker">
      <summary className="modifier-pack-picker-summary">
        Force a Pack pool in next shop
      </summary>
      <div className="modifier-pack-picker-grid">
        {PACK_POOLS.map((pool) => (
          <button
            key={pool.id}
            type="button"
            className="add-pack-button"
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
