import { useGame } from "../../store/game";
import { play } from "../system/sounds";
import { FINAL_ANTE } from "../../constants";
import { Button } from "../ui/Button";
import ModifierSpectralPicker from "./ModifierSpectralPicker";
import ModifierTarotPicker from "./ModifierTarotPicker";
import ModifierPlanetPicker from "./ModifierPlanetPicker";
import ModifierPackPicker from "./ModifierPackPicker";
import ModifierJokerPicker from "./ModifierJokerPicker";

export default function ModifierPanel() {
  const setDevChipsBonus = useGame((s) => s.setDevChipsBonus);
  const setDevMultBonus = useGame((s) => s.setDevMultBonus);
  const setDevMultFactor = useGame((s) => s.setDevMultFactor);
  const handleWin = useGame((s) => s.handleWin);
  const money = useGame((s) => s.money);
  const setMoney = useGame((s) => s.setMoney);
  const setHandSizeModifier = useGame((s) => s.setHandSizeModifier);
  const forceProbabilities = useGame((s) => s.forceProbabilities);
  const setForceProbabilities = useGame((s) => s.setForceProbabilities);
  const ante = useGame((s) => s.ante);
  const setAnte = useGame((s) => s.setAnte);

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
    <details className="min-h-0 w-full overflow-y-auto rounded-xl border border-border bg-surface px-4 pb-4 pt-2">
      <summary
        data-testid="modifier-disclosure"
        className="cursor-pointer select-none py-1 text-xs font-bold uppercase tracking-widest text-muted hover:text-chips"
      >
        Apply modifiers
      </summary>
      <div className="mt-2 flex flex-wrap items-stretch gap-1">
        <Button size="sm" className="text-chips" onClick={() => addChips(10)}>
          <span aria-hidden="true">🪙 </span>Add Chips
        </Button>
        <Button size="sm" className="text-mult" onClick={() => addMultiplier(1)}>
          <span aria-hidden="true">➕ </span>Add Multiplier
        </Button>
        <Button
          size="sm"
          className="text-mult"
          onClick={() => multiplyMultiplier(2)}
        >
          <span aria-hidden="true">✖️ </span>Multiply Multiplier
        </Button>
        <Button size="sm" onClick={() => handleWin()}>
          <span aria-hidden="true">🏆 </span>Win
        </Button>
        <Button
          size="sm"
          data-testid="add-money-button"
          className="text-money"
          onClick={() => adjustMoney(10)}
        >
          <span aria-hidden="true">💵 </span>Add $10
        </Button>
        <Button
          size="sm"
          className="text-mult"
          onClick={() => adjustMoney(-10)}
        >
          <span aria-hidden="true">💸 </span>Subtract $10
        </Button>
        <Button
          size="sm"
          onClick={() => setHandSizeModifier((prev) => prev - 1)}
        >
          <span aria-hidden="true">🤏 </span>Hand −1
        </Button>
        <Button
          size="sm"
          onClick={() => setHandSizeModifier((prev) => prev + 1)}
        >
          <span aria-hidden="true">✋ </span>Hand +1
        </Button>
        <Button
          size="sm"
          onClick={() => setAnte((prev) => Math.max(1, prev - 1))}
          disabled={ante <= 1}
        >
          <span aria-hidden="true">⏪ </span>Ante −1
        </Button>
        <Button
          size="sm"
          onClick={() => setAnte((prev) => Math.min(FINAL_ANTE, prev + 1))}
          disabled={ante >= FINAL_ANTE}
        >
          <span aria-hidden="true">⏩ </span>Ante +1
        </Button>
        <Button
          size="sm"
          variant="toggle"
          onClick={() => setForceProbabilities((p) => !p)}
          aria-pressed={forceProbabilities}
        >
          <span aria-hidden="true">🎲 </span>Force Probabilities{" "}
          {forceProbabilities ? "Off" : "On"}
        </Button>
        <ModifierTarotPicker />
        <ModifierPlanetPicker />
        <ModifierSpectralPicker />
        <ModifierPackPicker />
        <ModifierJokerPicker />
      </div>
    </details>
  );
}
