import { useState } from "react";
import { useTranslation } from "react-i18next";
import "./ModifierPanel.css";
import { humanPlayLog } from "../../ai/humanPlayWiring";
import { useGame } from "../../store/game";
import { play } from "../system/sounds";
import { FINAL_ANTE } from "../../constants";
import ModifierSpectralPicker from "./ModifierSpectralPicker";
import ModifierTarotPicker from "./ModifierTarotPicker";
import ModifierPlanetPicker from "./ModifierPlanetPicker";
import ModifierPackPicker from "./ModifierPackPicker";
import ModifierJokerPicker from "./ModifierJokerPicker";

const HUMAN_PLAY_KIND_LABELS = {
  hand: "devMenu.kind_hand",
  purchase: "devMenu.kind_purchase",
  reroll: "devMenu.kind_reroll",
  "consumable-use": "devMenu.kind_consumable-use",
  "joker-sell": "devMenu.kind_joker-sell",
  "blind-skip": "devMenu.kind_blind-skip",
} as const;

function isKnownKind(
  kind: string,
): kind is keyof typeof HUMAN_PLAY_KIND_LABELS {
  return kind in HUMAN_PLAY_KIND_LABELS;
}

export default function ModifierPanel() {
  const { t } = useTranslation();
  const [, setLogVersion] = useState(0);
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
  function exportHumanPlayLog() {
    const blob = new Blob([humanPlayLog().toJsonl()], {
      type: "application/jsonl",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "browslatro-human-play.jsonl";
    anchor.click();
    URL.revokeObjectURL(url);
  }
  function clearHumanPlayLog() {
    humanPlayLog().clear();
    setLogVersion((version) => version + 1);
  }
  const humanPlayCount = humanPlayLog().count();
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
          className="shrink-ante-button"
          onClick={() => setAnte((prev) => Math.max(1, prev - 1))}
          disabled={ante <= 1}
        >
          <span aria-hidden="true">⏪ </span>Ante −1
        </button>
        <button
          type="button"
          className="grow-ante-button"
          onClick={() => setAnte((prev) => Math.min(FINAL_ANTE, prev + 1))}
          disabled={ante >= FINAL_ANTE}
        >
          <span aria-hidden="true">⏩ </span>Ante +1
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
        <ModifierPackPicker />
        <ModifierJokerPicker />
      </div>
      <section
        className="human-play-log"
        aria-label={t("devMenu.humanPlayLog")}
      >
        <span
          className="human-play-log-count"
          data-testid="human-play-log-count"
        >
          {t("devMenu.recordedDecisions", { count: humanPlayCount })}
        </span>
        {humanPlayCount > 0 && (
          <span
            className="human-play-log-breakdown"
            data-testid="human-play-log-breakdown"
          >
            {Object.entries(humanPlayLog().counts())
              .map(
                ([kind, kindCount]) =>
                  `${isKnownKind(kind) ? t(HUMAN_PLAY_KIND_LABELS[kind]) : kind} ${kindCount}`,
              )
              .join(" \u00b7 ")}
          </span>
        )}
        <button
          type="button"
          className="human-play-log-export-button"
          onClick={exportHumanPlayLog}
          disabled={humanPlayCount === 0}
        >
          <span aria-hidden="true">📤 </span>
          {t("devMenu.exportLog")}
        </button>
        <button
          type="button"
          className="human-play-log-clear-button"
          onClick={clearHumanPlayLog}
          disabled={humanPlayCount === 0}
        >
          <span aria-hidden="true">🧹 </span>
          {t("devMenu.clearLog")}
        </button>
      </section>
    </details>
  );
}
