import { useCallback, useId, useRef, useState } from "react";
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
import {
  clearPlayerKey,
  maskPlayerKey,
  readStoredPlayerKey,
  storePlayerKey,
} from "../../ai/advisor/playerKey";
import KeyStorageDisclosure from "../game/KeyStorageDisclosure";
import { GET_KEY_URL } from "../game/PlayerKeyForm";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useFocusTrap } from "../system/useFocusTrap";

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
  const [storedKey, setStoredKey] = useState<string | null>(readStoredPlayerKey);
  const [replacingKey, setReplacingKey] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [muted, setMuted] = useState(isMuted);
  const [highVisibility, setHighVisibility] = useState(isHighVisibility);
  const [animationSpeed, setAnimationSpeedState] = useState<AnimationSpeed>(
    getAnimationSpeed,
  );
  const animationSpeedSelectId = useId();
  const languageSelectId = useId();
  const titleId = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  const handleClose = useCallback(() => setOpen(false), []);
  useEscapeToClose(handleClose, open);
  useFocusTrap(overlayRef, open);

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
          <div
            ref={overlayRef}
            className="modal-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onClick={handleClose}
          >
            <div
              className="modal options-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id={titleId}>{t("sidebar.options")}</h3>
              <div className="options-toggle-row">
                <button
                  className="btn btn--toggle"
                  aria-pressed={muted}
                  onClick={handleToggleMute}
                >
                  {muted
                    ? t("options.unmuteSounds")
                    : t("options.muteSounds")}
                </button>
                <button
                  className="btn btn--toggle"
                  aria-pressed={highVisibility}
                  onClick={handleToggleHighVisibility}
                >
                  {highVisibility
                    ? t("options.disableHighVisibility")
                    : t("options.enableHighVisibility")}
                </button>
              </div>
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
              <div className="options-field options-advisor-key">
                <span className="options-field-label">
                  {t("options.advisorKey")}
                </span>
                {storedKey !== null && !replacingKey ? (
                  <div className="options-key-row">
                    <code data-testid="options-advisor-key-masked">
                      {maskPlayerKey(storedKey)}
                    </code>
                    <button
                      className="btn btn--secondary"
                      onClick={() => setReplacingKey(true)}
                    >
                      {t("options.advisorKeyReplace")}
                    </button>
                    <button
                      className="btn btn--danger"
                      onClick={() => {
                        const confirmed = window.confirm(
                          t("options.advisorKeyRemoveConfirm"),
                        );
                        if (!confirmed) return;
                        clearPlayerKey();
                        setStoredKey(null);
                      }}
                    >
                      {t("options.advisorKeyRemove")}
                    </button>
                  </div>
                ) : (
                  <form
                    className="options-key-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const key = keyDraft.trim();
                      if (key === "") return;
                      storePlayerKey(key);
                      setStoredKey(key);
                      setKeyDraft("");
                      setReplacingKey(false);
                    }}
                  >
                    <input
                      className="options-key-input"
                      type="password"
                      value={keyDraft}
                      onChange={(event) => setKeyDraft(event.target.value)}
                      placeholder={t("advisor.keyPlaceholder")}
                      aria-label={t("advisor.keyLabel")}
                      data-testid="options-advisor-key-input"
                    />
                    <button
                      className="btn btn--secondary"
                      type="submit"
                      disabled={keyDraft.trim() === ""}
                    >
                      {t("advisor.keySave")}
                    </button>
                  </form>
                )}
                <a
                  className="options-key-link"
                  href={GET_KEY_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("advisor.keyLink")}
                </a>
                <KeyStorageDisclosure />
              </div>
              <div className="options-footer">
                <button
                  className="btn btn--danger"
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
                <button className="btn btn--secondary" onClick={handleClose}>
                  {t("options.close")}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default Options;
