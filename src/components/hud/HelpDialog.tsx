import { useCallback, useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { HELP_TUTORIALS, type HelpTutorialKind } from "./helpTutorials";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useFocusTrap } from "../system/useFocusTrap";
import { Button } from "../ui/Button";

interface HelpDialogProps {
  onClose: () => void;
}

const SECTION_ORDER: ReadonlyArray<HelpTutorialKind> = ["text", "video"];

const SECTION_HEADING_KEYS = {
  text: "help.textGuides",
  video: "help.videoTutorials",
} as const satisfies Record<HelpTutorialKind, string>;

export default function HelpDialog({ onClose }: HelpDialogProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const handleClose = useCallback(() => onClose(), [onClose]);
  useEscapeToClose(handleClose, true);
  const overlayRef = useRef<HTMLDivElement>(null);
  useFocusTrap(overlayRef);

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
      data-testid="help-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={handleClose}
    >
      <div
        className="flex max-h-[80vh] w-[min(90vw,32rem)] flex-col gap-3 overflow-y-auto rounded-xl border-2 border-border bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-center text-lg font-bold text-ink">
          {t("help.title")}
        </h2>
        {SECTION_ORDER.map((kind) => (
          <section key={kind} className="flex flex-col gap-1.5">
            <h3 className="text-xs font-bold tracking-wider text-muted uppercase">
              {t(SECTION_HEADING_KEYS[kind])}
            </h3>
            <ul className="flex flex-col gap-1">
              {HELP_TUTORIALS.filter((tutorial) => tutorial.kind === kind).map(
                (tutorial) => (
                  <li key={tutorial.url}>
                    <a
                      className="block rounded-md border border-border bg-raised px-2 py-1.5 font-semibold text-ink hover:border-chips hover:text-chips focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                      href={tutorial.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t(tutorial.titleKey)}
                      <span className="sr-only">
                        {" "}
                        ({t("a11y.opensInNewTab")})
                      </span>
                    </a>
                  </li>
                ),
              )}
            </ul>
          </section>
        ))}
        <Button
          variant="primary"
          size="lg"
          className="self-center"
          onClick={handleClose}
          autoFocus
        >
          {t("help.close")}
        </Button>
      </div>
    </div>,
    document.body,
  );
}
