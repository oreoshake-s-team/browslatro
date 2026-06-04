import "./ModifierPanel.css";
import { useGame } from "../../store/game";
import { play } from "../system/sounds";
import ModifierSpectralPicker from "./ModifierSpectralPicker";
import ModifierTarotPicker from "./ModifierTarotPicker";
import ModifierPlanetPicker from "./ModifierPlanetPicker";

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
          <span aria-hidden="true">🪙 </span>Add Chips
        </button>
        <button
          className="add-multiplier-button"
          onClick={() => addMultiplier(1)}
        >
          <span aria-hidden="true">➕ </span>Add Multiplier
        </button>
        <button
          className="multiply-multiplier-button"
          onClick={() => multiplyMultiplier(2)}
        >
          <span aria-hidden="true">✖️ </span>Multiply Multiplier
        </button>
        <button className="win-button" onClick={() => handleWin()}>
          <span aria-hidden="true">🏆 </span>Win
        </button>
        <button className="add-money-button" onClick={() => adjustMoney(10)}>
          <span aria-hidden="true">💵 </span>Add $10
        </button>
        <button
          className="subtract-money-button"
          onClick={() => adjustMoney(-10)}
        >
          <span aria-hidden="true">💸 </span>Subtract $10
        </button>
        <button
          type="button"
          className="shrink-hand-button"
          onClick={() => setHandSizeModifier((prev) => prev - 1)}
        >
          <span aria-hidden="true">🤏 </span>Hand −1
        </button>
        <button
          type="button"
          className="grow-hand-button"
          onClick={() => setHandSizeModifier((prev) => prev + 1)}
        >
          <span aria-hidden="true">✋ </span>Hand +1
        </button>
        <button
          type="button"
          className="force-probabilities-button"
          onClick={() => setForceProbabilities((p) => !p)}
          aria-pressed={forceProbabilities}
        >
          <span aria-hidden="true">🎲 </span>Force Probabilities {forceProbabilities ? "Off" : "On"}
        </button>
        <ModifierTarotPicker />
        <ModifierPlanetPicker />
        <ModifierSpectralPicker />
      </div>
    </details>
  );
}
