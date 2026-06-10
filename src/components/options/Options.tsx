import { useCallback, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import "./Options.css";
import { createPortal } from "react-dom";
import {
  LOCALE_NAMES,
  SUPPORTED_LOCALES,
  isLocale,
  persistLocale,
} from "../../i18n";
import {
  ANIMATION_SPEED_VALUES,
  getAnimationSpeed,
  isHighVisibility,
  isMuted,
  setAnimationSpeed,
  toggleHighVisibility,
  toggleMute,
  type AnimationSpeed,
} from "../system/preferences";
import { useEscapeToClose } from "../system/useEscapeToClose";

interface OptionsProps {
  onNewGame: () => void;
  onHighVisibilityChange?: (enabled: boolean) => void;
  onAnimationSpeedChange?: (value: AnimationSpeed) => void;
}

const ANIMATION_SPEED_LABEL_KEYS = {
  slow: "options.speedSlow",
  normal: "options.speedNormal",
  fast: "options.speedFast",
  instant: "options.speedInstant",
} as const satisfies Record<AnimationSpeed, string>;

function Options({
  onNewGame,
  onHighVisibilityChange,
  onAnimationSpeedChange,
}: OptionsProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(isMuted);
  const [highVisibility, setHighVisibility] = useState(isHighVisibility);
  const [animationSpeed, setAnimationSpeedState] = useState<AnimationSpeed>(
    getAnimationSpeed,
  );
  const animationSpeedSelectId = useId();
  const languageSelectId = useId();
  const handleClose = useCallback(() => setOpen(false), []);
  useEscapeToClose(handleClose, open);

  function handleToggleMute() {
    toggleMute();
    setMuted(isMuted());
  }

  function handleToggleHighVisibility() {
    toggleHighVisibility();
    const next = isHighVisibility();
    setHighVisibility(next);
    onHighVisibilityChange?.(next);
  }

  function handleAnimationSpeedChange(
    event: React.ChangeEvent<HTMLSelectElement>,
  ) {
    const next = event.target.value as AnimationSpeed;
    setAnimationSpeed(next);
    setAnimationSpeedState(next);
    onAnimationSpeedChange?.(next);
  }

  function handleLanguageChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = event.target.value;
    if (!isLocale(next)) return;
    void i18n.changeLanguage(next);
    persistLocale(next);
  }

  return (
    <>
      <button className="btn btn--ghost" onClick={() => setOpen(true)}>
        {t("sidebar.options")}
      </button>
      {open &&
        createPortal(
          <div className="modal-overlay" onClick={handleClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>{t("sidebar.options")}</h3>
              <button
                className="options-button options-button--toggle"
                aria-pressed={muted}
                onClick={handleToggleMute}
              >
                {muted
                  ? `🔇 ${t("options.unmuteSounds")}`
                  : `🔊 ${t("options.muteSounds")}`}
              </button>
              <button
                className="options-button options-button--toggle"
                aria-pressed={highVisibility}
                onClick={handleToggleHighVisibility}
              >
                {highVisibility
                  ? `🎨 ${t("options.disableHighVisibility")}`
                  : `🎨 ${t("options.enableHighVisibility")}`}
              </button>
              <label
                className="options-field"
                htmlFor={animationSpeedSelectId}
              >
                <span className="options-field-label">
                  {t("options.animationSpeed")}
                </span>
                <select
                  id={animationSpeedSelectId}
                  className="options-select"
                  value={animationSpeed}
                  onChange={handleAnimationSpeedChange}
                >
                  {ANIMATION_SPEED_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {t(ANIMATION_SPEED_LABEL_KEYS[value])}
                    </option>
                  ))}
                </select>
              </label>
              <label className="options-field" htmlFor={languageSelectId}>
                <span className="options-field-label">
                  {t("options.language")}
                </span>
                <select
                  id={languageSelectId}
                  className="options-select"
                  data-testid="options-language"
                  value={isLocale(i18n.language) ? i18n.language : "en"}
                  onChange={handleLanguageChange}
                >
                  {SUPPORTED_LOCALES.map((locale) => (
                    <option key={locale} value={locale} lang={locale}>
                      {LOCALE_NAMES[locale]}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="options-button options-button--destructive"
                onClick={() => {
                  const confirmed = window.confirm(
                    t("options.newGameConfirm"),
                  );
                  if (!confirmed) return;
                  onNewGame();
                  handleClose();
                }}
              >
                {t("options.newGame")}
              </button>
              <button className="options-button" onClick={handleClose}>
                {t("options.close")}
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default Options;
