import { useState } from "react";
import { useTranslation } from "react-i18next";
import { humanPlayLog } from "../../ai/humanPlayWiring";
import { Button } from "../ui/Button";

export default function HumanPlayLog() {
  const { t } = useTranslation();
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

  const humanPlayCount = humanPlayLog().count();

  return (
    <details className="text-sm">
      <summary className="cursor-pointer rounded-md text-xs font-semibold tracking-wider text-muted uppercase select-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">
        {t("devMenu.humanPlayLog")}
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        <span className="text-muted" data-testid="human-play-log-count">
          {t("devMenu.recordedDecisions", { count: humanPlayCount })}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={exportHumanPlayLog}
            disabled={humanPlayCount === 0}
          >
            {t("devMenu.exportLog")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHumanPlayLog}
            disabled={humanPlayCount === 0}
          >
            {t("devMenu.clearLog")}
          </Button>
        </div>
      </div>
    </details>
  );
}
