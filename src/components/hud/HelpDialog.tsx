import { useCallback, useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import "./Help.css";
import { HELP_TUTORIALS, type HelpTutorialKind } from "./helpTutorials";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useFocusTrap } from "../system/useFocusTrap";

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
      className="help-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={handleClose}
    >
      <div className="help-modal" onClick={(e) => e.stopPropagation()}>
        <h2 id={titleId} className="help-title">
          {t("help.title")}
        </h2>
        {SECTION_ORDER.map((kind) => (
          <section key={kind} className="help-section">
            <h3 className="help-section-title">
              {t(SECTION_HEADING_KEYS[kind])}
            </h3>
            <ul className="help-link-list">
              {HELP_TUTORIALS.filter((tutorial) => tutorial.kind === kind).map(
                (tutorial) => (
                  <li key={tutorial.url} className="help-link-row">
                    <a
                      className="help-link"
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
        <button
          type="button"
          className="btn btn--primary help-close"
          onClick={handleClose}
          autoFocus
        >
          {t("help.close")}
        </button>
      </div>
    </div>,
    document.body,
  );
}
