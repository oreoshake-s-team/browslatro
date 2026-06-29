import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "./AdviceFeedbackControl.css";

export interface AdviceFeedbackControlProps {
  readonly candidateLabels: ReadonlyArray<string>;
  readonly onSubmit: (correctedIndex: number | null) => void;
  readonly onAgree: () => void;
  readonly agreeDisabled?: boolean;
  readonly agreeDisabledReason?: string;
  readonly onPreview?: (correctedIndex: number) => void;
  readonly submitLabel?: string;
  readonly testIdPrefix?: string;
}

export default function AdviceFeedbackControl({
  candidateLabels,
  onSubmit,
  onAgree,
  agreeDisabled = false,
  agreeDisabledReason,
  onPreview,
  submitLabel,
  testIdPrefix = "advice-feedback",
}: AdviceFeedbackControlProps): React.JSX.Element {
  const { t } = useTranslation();
  const groupName = useId();
  const blockedId = useId();
  const firstRadioRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const record = (correctedIndex: number | null): void => {
    onSubmit(correctedIndex);
    setOpen(false);
    setSubmitted(true);
  };

  const agree = (): void => {
    if (agreeDisabled) return;
    onAgree();
    setSubmitted(true);
  };

  const openPicker = (): void => {
    setOpen(true);
    requestAnimationFrame(() => firstRadioRef.current?.focus());
  };

  const cancel = (): void => {
    setOpen(false);
    setSelected(null);
  };

  if (submitted) {
    return (
      <p
        className="advice-feedback-recorded"
        role="status"
        data-testid={`${testIdPrefix}-recorded`}
      >
        {t("advisor.feedbackRecorded")}
      </p>
    );
  }

  return (
    <div className="advice-feedback">
      {!open ? (
        <div
          className="advice-feedback-choice"
          role="group"
          aria-label={t("advisor.feedbackChoiceLabel")}
        >
          <button
            type="button"
            className="btn btn--secondary advice-feedback-agree"
            data-testid={`${testIdPrefix}-agree`}
            aria-label={t("advisor.feedbackAgreeLabel")}
            aria-disabled={agreeDisabled || undefined}
            aria-describedby={
              agreeDisabled && agreeDisabledReason !== undefined
                ? blockedId
                : undefined
            }
            onClick={agree}
          >
            <span aria-hidden="true">👍 </span>
            {t("advisor.feedbackGoodPick")}
          </button>
          <button
            type="button"
            className="btn btn--secondary advice-feedback-open"
            data-testid={`${testIdPrefix}-open`}
            aria-expanded={false}
            aria-label={t("advisor.feedbackOpenLabel")}
            onClick={openPicker}
          >
            <span aria-hidden="true">👎 </span>
            {t("advisor.feedbackBadPick")}
          </button>
          {agreeDisabled && agreeDisabledReason !== undefined && (
            <p
              id={blockedId}
              className="advice-feedback-agree-blocked"
              role="note"
              data-testid={`${testIdPrefix}-agree-blocked`}
            >
              {agreeDisabledReason}
            </p>
          )}
        </div>
      ) : (
        <div
          className="advice-feedback-picker"
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
          }}
        >
          <fieldset className="advice-feedback-fieldset">
            <legend className="advice-feedback-legend">
              {t("advisor.feedbackPrompt")}
            </legend>
            {candidateLabels.map((label, index) => {
              const id = `${groupName}-${index}`;
              return (
                <label key={id} className="advice-feedback-option" htmlFor={id}>
                  <input
                    ref={index === 0 ? firstRadioRef : undefined}
                    type="radio"
                    id={id}
                    name={groupName}
                    data-testid={`${testIdPrefix}-option-${index}`}
                    checked={selected === index}
                    onChange={() => {
                      setSelected(index);
                      onPreview?.(index);
                    }}
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </fieldset>
          <div className="advice-feedback-actions">
            <button
              type="button"
              className="btn advice-feedback-submit"
              data-testid={`${testIdPrefix}-submit`}
              disabled={selected === null}
              onClick={() => {
                if (selected !== null) record(selected);
              }}
            >
              {submitLabel ?? t("advisor.feedbackSubmit")}
            </button>
            <button
              type="button"
              className="btn btn--secondary advice-feedback-just-bad"
              data-testid={`${testIdPrefix}-just-bad`}
              onClick={() => record(null)}
            >
              {t("advisor.feedbackJustBad")}
            </button>
            <button
              type="button"
              className="btn btn--secondary advice-feedback-cancel"
              data-testid={`${testIdPrefix}-cancel`}
              onClick={cancel}
            >
              {t("advisor.feedbackCancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
