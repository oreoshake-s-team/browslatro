import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "./AdminModeController.css";
import { useKonamiCode } from "./useKonamiCode";
import { toggleAdminMode } from "./preferences";
import { play } from "./sounds";
import { announce } from "./LiveAnnouncer";

const TOAST_DURATION_MS = 2200;

export default function AdminModeController() {
  const { t } = useTranslation();
  const [toast, setToast] = useState<string | null>(null);

  useKonamiCode(() => {
    const enabled = toggleAdminMode();
    play(enabled ? "gold" : "pop");
    const message = enabled ? t("admin.enabled") : t("admin.disabled");
    announce(message);
    setToast(message);
  });

  useEffect(() => {
    if (toast === null) return;
    const id = window.setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [toast]);

  if (toast === null) return null;
  return (
    <div className="admin-toast" aria-hidden="true" data-testid="admin-toast">
      {toast}
    </div>
  );
}
