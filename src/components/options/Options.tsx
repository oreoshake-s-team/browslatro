import { memo, useCallback, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
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
  isDyslexicFont,
  isHighVisibility,
  isMuted,
  setAnimationSpeed,
  toggleDyslexicFont,
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

const FIELD_CLASS = "flex flex-col gap-1";
const FIELD_LABEL_CLASS =
  "text-xs font-semibold tracking-wide text-muted uppercase";
const CONTROL_CLASS =
  "rounded-md border border-border bg-raised px-1.5 py-1 text-sm text-ink accent-chips focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

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
  const [dyslexicFont, setDyslexicFont] = useState(isDyslexicFont);
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

  function handleToggleDyslexicFont() {
    toggleDyslexicFont();
    setDyslexicFont(isDyslexicFont());
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
      <Button variant="ghost" onClick={() => setOpen(true)}>
        {t("sidebar.options")}
      </Button>
      {open &&
        createPortal(
          <div
            ref={overlayRef}
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/60"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-modal-overlay=""
            data-testid="modal-overlay"
            onClick={handleClose}
          >
            <div
              className="flex max-h-[85vh] w-[94vw] max-w-72 flex-col gap-3 overflow-y-auto rounded-xl border border-border bg-surface p-4 text-sm text-muted shadow-xl"
              data-testid="options-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 id={titleId} className="text-base font-bold text-ink">
                {t("sidebar.options")}
              </h3>
              <div className="flex flex-wrap gap-1">
                <Button
                  variant="toggle"
                  size="sm"
                  aria-pressed={muted}
                  onClick={handleToggleMute}
                >
                  {muted
                    ? t("options.unmuteSounds")
                    : t("options.muteSounds")}
                </Button>
                <Button
                  variant="toggle"
                  size="sm"
                  aria-pressed={highVisibility}
                  onClick={handleToggleHighVisibility}
                >
                  {highVisibility
                    ? t("options.disableHighVisibility")
                    : t("options.enableHighVisibility")}
                </Button>
                <Button
                  variant="toggle"
                  size="sm"
                  aria-pressed={dyslexicFont}
                  onClick={handleToggleDyslexicFont}
                >
                  {dyslexicFont
                    ? t("options.disableDyslexicFont")
                    : t("options.enableDyslexicFont")}
                </Button>
              </div>
              <label className={FIELD_CLASS} htmlFor={animationSpeedSelectId}>
                <span className={FIELD_LABEL_CLASS}>
                  {t("options.animationSpeed")}
                </span>
                <select
                  id={animationSpeedSelectId}
                  className={CONTROL_CLASS}
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
              <label className={FIELD_CLASS} htmlFor={languageSelectId}>
                <span className={FIELD_LABEL_CLASS}>
                  {t("options.language")}
                </span>
                <select
                  id={languageSelectId}
                  className={CONTROL_CLASS}
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
              <div className={FIELD_CLASS}>
                <span className={FIELD_LABEL_CLASS}>
                  {t("options.advisorKey")}
                </span>
                {storedKey !== null && !replacingKey ? (
                  <div className="flex items-center gap-1">
                    <code data-testid="options-advisor-key-masked">
                      {maskPlayerKey(storedKey)}
                    </code>
                    <Button onClick={() => setReplacingKey(true)}>
                      {t("options.advisorKeyReplace")}
                    </Button>
                    <Button
                      variant="danger"
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
                    </Button>
                  </div>
                ) : (
                  <form
                    className="flex items-center gap-1"
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
                      className={`min-w-0 flex-1 font-mono ${CONTROL_CLASS}`}
                      type="password"
                      value={keyDraft}
                      onChange={(event) => setKeyDraft(event.target.value)}
                      placeholder={t("advisor.keyPlaceholder")}
                      aria-label={t("advisor.keyLabel")}
                      data-testid="options-advisor-key-input"
                    />
                    <Button type="submit" disabled={keyDraft.trim() === ""}>
                      {t("advisor.keySave")}
                    </Button>
                  </form>
                )}
                <a
                  className="text-xs text-chips hover:underline"
                  href={GET_KEY_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("advisor.keyLink")}
                </a>
                <KeyStorageDisclosure />
              </div>
              <div
                className="mt-1 flex justify-end gap-1"
                data-testid="options-footer"
              >
                <Button
                  variant="danger"
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
                </Button>
                <Button onClick={handleClose}>{t("options.close")}</Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

export default memo(Options);
