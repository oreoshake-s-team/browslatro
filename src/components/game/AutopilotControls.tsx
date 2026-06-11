import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { HandOption } from "../../ai/getHandOptions";
import { tHandLabel } from "../../i18n/handLabels";
import "./AutopilotControls.css";

export interface AutopilotControlsProps {
  readonly proposal: HandOption;
  readonly onApprove: () => void;
  readonly onStop: () => void;
}

function describeProposal(t: TFunction, proposal: HandOption): string {
  if (proposal.action === "play") {
    return t("advisor.autopilotPlayProposal", {
      hand: tHandLabel(t, proposal.handLabel),
    });
  }
  return t("advisor.autopilotDiscardProposal");
}

export default function AutopilotControls({
  proposal,
  onApprove,
  onStop,
}: AutopilotControlsProps): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <div
      className="autopilot-controls"
      role="group"
      aria-label={t("advisor.autopilot")}
    >
      <p className="autopilot-proposal" role="status">
        {describeProposal(t, proposal)}
      </p>
      <div className="autopilot-actions">
        <button
          className="btn autopilot-approve-button"
          onClick={onApprove}
        >
          <span aria-hidden="true">✅ </span>
          {t("advisor.autopilotApprove")}
        </button>
        <button className="btn autopilot-stop-button" onClick={onStop}>
          <span aria-hidden="true">🛑 </span>
          {t("advisor.autopilotStop")}
        </button>
      </div>
    </div>
  );
}
