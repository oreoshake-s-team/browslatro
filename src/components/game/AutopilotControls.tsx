import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { HandOption } from "../../ai/getHandOptions";
import type { MoveExplanationState } from "../../ai/advisor/useMoveExplanation";
import type { DownloadProgress } from "../../ai/policy";
import { tHandLabel } from "../../i18n/handLabels";
import "./AutopilotControls.css";

export interface AutopilotControlsProps {
  readonly proposal: HandOption | null;
  readonly modelProgress: DownloadProgress | null;
  readonly explanation: MoveExplanationState;
  readonly onApprove: () => void;
  readonly onStop: () => void;
  readonly onExplain: () => void;
}

function describeProposal(t: TFunction, proposal: HandOption): string {
  if (proposal.action === "play") {
    return t("advisor.autopilotPlayProposal", {
      hand: tHandLabel(t, proposal.handLabel),
    });
  }
  return t("advisor.autopilotDiscardProposal");
}

function renderExplanation(
  t: TFunction,
  explanation: MoveExplanationState,
): React.JSX.Element | null {
  switch (explanation.phase) {
    case "idle":
      return null;
    case "loading":
      return (
        <p className="autopilot-explanation" role="status">
          {t("advisor.thinking")}
        </p>
      );
    case "error":
      return (
        <p className="autopilot-explanation" role="status">
          {t("advisor.autopilotExplainError")}
        </p>
      );
    case "ready":
      return (
        <div className="autopilot-explanation">
          <p>{explanation.explanation}</p>
          <p className="autopilot-concept">{explanation.concept}</p>
        </div>
      );
  }
}

export default function AutopilotControls({
  proposal,
  modelProgress,
  explanation,
  onApprove,
  onStop,
  onExplain,
}: AutopilotControlsProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div
      className="autopilot-controls"
      role="group"
      aria-label={t("advisor.autopilot")}
    >
      {proposal !== null ? (
        <p className="autopilot-proposal" role="status">
          {describeProposal(t, proposal)}
        </p>
      ) : modelProgress !== null ? (
        <div className="autopilot-loading" role="status">
          <p className="autopilot-proposal">{t("advisor.downloadingModel")}</p>
          <progress
            className="autopilot-progress"
            aria-label={t("advisor.downloadingModel")}
            value={
              modelProgress.total !== null ? modelProgress.loaded : undefined
            }
            max={
              modelProgress.total !== null ? modelProgress.total : undefined
            }
          />
        </div>
      ) : null}
      <div className="autopilot-actions">
        {proposal !== null && (
          <button className="btn autopilot-approve-button" onClick={onApprove}>
            <span aria-hidden="true">✅ </span>
            {t("advisor.autopilotApprove")}
          </button>
        )}
        {proposal !== null && (
          <button
            className="btn autopilot-explain-button"
            onClick={onExplain}
            disabled={explanation.phase === "loading"}
          >
            <span aria-hidden="true">🎓 </span>
            {t("advisor.autopilotExplain")}
          </button>
        )}
        <button className="btn autopilot-stop-button" onClick={onStop}>
          <span aria-hidden="true">🛑 </span>
          {t("advisor.autopilotStop")}
        </button>
      </div>
      {renderExplanation(t, explanation)}
    </div>
  );
}
