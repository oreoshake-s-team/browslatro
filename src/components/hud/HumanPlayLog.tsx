import { useState } from "react";
import { useTranslation } from "react-i18next";
import "./HumanPlayLog.css";
import { humanPlayLog } from "../../ai/humanPlayWiring";
import { usePreferences } from "../system/preferences";

export default function HumanPlayLog() {
  const { t } = useTranslation();
  const adminMode = usePreferences((s) => s.adminMode);
  const [, setLogVersion] = useState(0);

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

  if (!adminMode) return null;

  const humanPlayCount = humanPlayLog().count();

  return (
    <details className="human-play-log">
      <summary className="human-play-log__summary">
        {t("devMenu.humanPlayLog")}
      </summary>
      <div className="human-play-log__body">
        <span
          className="human-play-log__count"
          data-testid="human-play-log-count"
        >
          {t("devMenu.recordedDecisions", { count: humanPlayCount })}
        </span>
        <div className="human-play-log__actions">
          <button
            type="button"
            className="btn btn--secondary human-play-log__export"
            onClick={exportHumanPlayLog}
            disabled={humanPlayCount === 0}
          >
            {t("devMenu.exportLog")}
          </button>
          <button
            type="button"
            className="btn btn--ghost human-play-log__clear"
            onClick={clearHumanPlayLog}
            disabled={humanPlayCount === 0}
          >
            {t("devMenu.clearLog")}
          </button>
        </div>
      </div>
    </details>
  );
}
