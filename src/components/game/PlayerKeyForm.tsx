import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { storePlayerKey } from "../../ai/advisor/playerKey";
import KeyStorageDisclosure from "./KeyStorageDisclosure";
import { Button } from "../ui/Button";

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
      className="flex flex-col gap-2 border-t border-border pt-3"
      onSubmit={(event) => {
        event.preventDefault();
        const key = draft.trim();
        if (key === "") return;
        storePlayerKey(key);
        setDraft("");
        onSaved();
      }}
    >
      <label
        className="text-sm font-bold text-ink"
        htmlFor="player-key-input"
      >
        {t("advisor.keyLabel")}
      </label>
      <div className="flex gap-1.5">
        <input
          id="player-key-input"
          ref={inputRef}
          className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 font-mono text-sm text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
          type="password"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t("advisor.keyPlaceholder")}
          data-testid="player-key-input"
        />
        <Button type="submit" size="sm" disabled={draft.trim() === ""}>
          {t("advisor.keySave")}
        </Button>
      </div>
      <ol className="list-decimal pl-5 text-xs text-muted">
        <li>{t("advisor.keyStep1")}</li>
        <li>{t("advisor.keyStep2")}</li>
        <li>{t("advisor.keyStep3")}</li>
      </ol>
      <KeyStorageDisclosure />
      <a
        className="text-sm text-chips hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
        href={GET_KEY_URL}
        target="_blank"
        rel="noreferrer"
      >
        {t("advisor.keyLink")}
      </a>
    </form>
  );
}
