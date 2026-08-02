import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";

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
        className="font-bold text-success"
        role="status"
        data-testid={`${testIdPrefix}-recorded`}
      >
        {t("advisor.feedbackRecorded")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {!open ? (
        <div
          className="flex flex-wrap gap-1"
          role="group"
          aria-label={t("advisor.feedbackChoiceLabel")}
        >
          <Button
            variant="secondary"
            className="flex-1 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
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
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            data-testid={`${testIdPrefix}-open`}
            aria-expanded={false}
            aria-label={t("advisor.feedbackOpenLabel")}
            onClick={openPicker}
          >
            <span aria-hidden="true">👎 </span>
            {t("advisor.feedbackBadPick")}
          </Button>
          {agreeDisabled && agreeDisabledReason !== undefined && (
            <p
              id={blockedId}
              className="basis-full text-xs text-muted"
              role="note"
              data-testid={`${testIdPrefix}-agree-blocked`}
            >
              {agreeDisabledReason}
            </p>
          )}
        </div>
      ) : (
        <div
          className="flex flex-col gap-1.5 rounded-lg border border-advisor/50 bg-advisor/10 p-2"
          onKeyDown={(e) => {
            if (e.key === "Escape") cancel();
          }}
        >
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-xs font-bold tracking-wider text-muted uppercase">
              {t("advisor.feedbackPrompt")}
            </legend>
            {candidateLabels.map((label, index) => {
              const id = `${groupName}-${index}`;
              return (
                <label
                  key={id}
                  className="flex cursor-pointer items-center gap-1"
                  htmlFor={id}
                >
                  <input
                    ref={index === 0 ? firstRadioRef : undefined}
                    type="radio"
                    id={id}
                    name={groupName}
                    className="accent-advisor"
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
          <div className="flex flex-wrap gap-1">
            <Button
              variant="advisor"
              data-testid={`${testIdPrefix}-submit`}
              disabled={selected === null}
              onClick={() => {
                if (selected !== null) record(selected);
              }}
            >
              {submitLabel ?? t("advisor.feedbackSubmit")}
            </Button>
            <Button
              variant="secondary"
              data-testid={`${testIdPrefix}-just-bad`}
              onClick={() => record(null)}
            >
              {t("advisor.feedbackJustBad")}
            </Button>
            <Button
              variant="secondary"
              data-testid={`${testIdPrefix}-cancel`}
              onClick={cancel}
            >
              {t("advisor.feedbackCancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
