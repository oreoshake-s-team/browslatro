import "./ModifierPanel.css";
import { useGame } from "../../store/game";
import { play } from "../system/sounds";
import { SHOP_PACK_SLOTS } from "../../items/shop";
import type { PackPool } from "../../items/packs";

type QueueablePool = Extract<
  PackPool,
  "standard" | "celestial" | "arcana" | "spectral"
>;

const QUEUEABLE_PACK_POOLS: ReadonlyArray<{
  readonly pool: QueueablePool;
  readonly icon: string;
  readonly label: string;
}> = [
  { pool: "standard", icon: "🃏", label: "Standard" },
  { pool: "celestial", icon: "🌌", label: "Celestial" },
  { pool: "arcana", icon: "🔮", label: "Arcana" },
  { pool: "spectral", icon: "👻", label: "Spectral" },
];

function countByPool(
  pools: ReadonlyArray<PackPool>,
): Readonly<Record<QueueablePool, number>> {
  const counts: Record<QueueablePool, number> = {
    standard: 0,
    celestial: 0,
    arcana: 0,
    spectral: 0,
  };
  for (const pool of pools) {
    if (pool in counts) counts[pool as QueueablePool] += 1;
  }
  return counts;
}

export default function ModifierPanel() {
  const setDevChipsBonus = useGame((s) => s.setDevChipsBonus);
  const setDevMultBonus = useGame((s) => s.setDevMultBonus);
  const setDevMultFactor = useGame((s) => s.setDevMultFactor);
  const handleWin = useGame((s) => s.handleWin);
  const money = useGame((s) => s.money);
  const setMoney = useGame((s) => s.setMoney);
  const setHandSizeModifier = useGame((s) => s.setHandSizeModifier);
  const setExtraPackSlots = useGame((s) => s.setExtraPackSlots);
  const pendingForcedPacks = useGame((s) => s.pendingForcedPacks);
  const setPendingForcedPacks = useGame((s) => s.setPendingForcedPacks);
  const adjustVoucherSlots = useGame((s) => s.adjustVoucherSlots);
  const forceProbabilities = useGame((s) => s.forceProbabilities);
  const setForceProbabilities = useGame((s) => s.setForceProbabilities);

  const forcedPackCounts = countByPool(pendingForcedPacks);
  const totalPendingPacks = pendingForcedPacks.length;

  function addChips(amount: number) {
    play("pop");
    setDevChipsBonus((prev) => prev + amount);
  }
  function addMultiplier(amount: number) {
    play("pop");
    setDevMultBonus((prev) => prev + amount);
  }
  function multiplyMultiplier(factor: number) {
    play("pop");
    setDevMultFactor((prev) => prev * factor);
  }
  function adjustMoney(delta: number) {
    setMoney(money + delta);
  }
  return (
    <details className="modifier-selection">
      <summary className="modifier-disclosure">Apply modifiers</summary>
      <div className="modifier-grid">
        <button className="add-chips-button" onClick={() => addChips(10)}>
          🪙 Add Chips
        </button>
        <button
          className="add-multiplier-button"
          onClick={() => addMultiplier(1)}
        >
          ➕ Add Multiplier
        </button>
        <button
          className="multiply-multiplier-button"
          onClick={() => multiplyMultiplier(2)}
        >
          ✖️ Multiply Multiplier
        </button>
        <button className="win-button" onClick={() => handleWin()}>
          🏆 Win
        </button>
        <button className="add-money-button" onClick={() => adjustMoney(10)}>
          💵 Add $10
        </button>
        <button
          className="subtract-money-button"
          onClick={() => adjustMoney(-10)}
        >
          💸 Subtract $10
        </button>
        <button
          type="button"
          className="shrink-hand-button"
          onClick={() => setHandSizeModifier((prev) => prev - 1)}
        >
          🤏 Hand −1
        </button>
        <button
          type="button"
          className="grow-hand-button"
          onClick={() => setHandSizeModifier((prev) => prev + 1)}
        >
          ✋ Hand +1
        </button>
        <button
          type="button"
          className="shrink-pack-slots-button"
          onClick={() =>
            setExtraPackSlots((prev) => Math.max(-SHOP_PACK_SLOTS, prev - 1))
          }
        >
          📦 Packs −1
        </button>
        <button
          type="button"
          className="grow-pack-slots-button"
          onClick={() => setExtraPackSlots((prev) => prev + 1)}
        >
          🎁 Packs +1
        </button>
        {QUEUEABLE_PACK_POOLS.map(({ pool, icon, label }) => {
          const count = forcedPackCounts[pool];
          const suffix = count > 0 ? ` (${count})` : "";
          return (
            <button
              key={pool}
              type="button"
              className={`add-pack-button add-pack-button-${pool}`}
              onClick={() =>
                setPendingForcedPacks((prev) => [...prev, pool])
              }
            >
              {icon} Add {label} pack{suffix}
            </button>
          );
        })}
        <button
          type="button"
          className="clear-pending-packs-button"
          onClick={() => setPendingForcedPacks([])}
          disabled={totalPendingPacks === 0}
          aria-disabled={totalPendingPacks === 0}
        >
          ↩️ Clear pending packs
        </button>
        <button
          type="button"
          className="shrink-voucher-slots-button"
          onClick={() => adjustVoucherSlots(-1)}
        >
          🎟️ Vouchers −1
        </button>
        <button
          type="button"
          className="grow-voucher-slots-button"
          onClick={() => adjustVoucherSlots(1)}
        >
          🎫 Vouchers +1
        </button>
        <button
          type="button"
          className="force-probabilities-button"
          onClick={() => setForceProbabilities((p) => !p)}
          aria-pressed={forceProbabilities}
        >
          🎲 Force Probabilities {forceProbabilities ? "Off" : "On"}
        </button>
      </div>
    </details>
  );
}
