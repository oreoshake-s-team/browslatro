import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { storePlayerKey } from "../../ai/advisor/playerKey";
import KeyStorageDisclosure from "./KeyStorageDisclosure";
import "./PlayerKeyForm.css";

export const GET_KEY_URL = "https://console.anthropic.com/settings/keys";

export interface PlayerKeyFormProps {
  readonly onSaved: () => void;
  readonly focusOnMount?: boolean;
}

export default function PlayerKeyForm({
  onSaved,
  focusOnMount = false,
}: PlayerKeyFormProps): React.JSX.Element {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusOnMount) inputRef.current?.focus();
  }, [focusOnMount]);

  return (
    <form
      className="player-key-form"
      onSubmit={(event) => {
        event.preventDefault();
        const key = draft.trim();
        if (key === "") return;
        storePlayerKey(key);
        setDraft("");
        onSaved();
      }}
    >
      <label className="player-key-label" htmlFor="player-key-input">
        {t("advisor.keyLabel")}
      </label>
      <div className="player-key-row">
        <input
          id="player-key-input"
          ref={inputRef}
          className="player-key-input"
          type="password"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="sk-ant-…"
          data-testid="player-key-input"
        />
        <button
          type="submit"
          className="btn player-key-save"
          disabled={draft.trim() === ""}
        >
          {t("advisor.keySave")}
        </button>
      </div>
      <ol className="player-key-steps">
        <li>{t("advisor.keyStep1")}</li>
        <li>{t("advisor.keyStep2")}</li>
        <li>{t("advisor.keyStep3")}</li>
      </ol>
      <KeyStorageDisclosure />
      <a
        className="player-key-link"
        href={GET_KEY_URL}
        target="_blank"
        rel="noreferrer"
      >
        {t("advisor.keyLink")}
      </a>
    </form>
  );
}
