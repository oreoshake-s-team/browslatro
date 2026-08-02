import { useTranslation } from "react-i18next";

export default function KeyStorageDisclosure(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <section
      className="rounded-md border border-money/40 bg-money/10 px-3 py-2"
      aria-label={t("advisor.keyStorageTitle")}
      data-testid="key-storage-disclosure"
    >
      <p className="mb-1 text-xs font-bold text-ink">
        {t("advisor.keyStorageTitle")}
      </p>
      <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-muted">
        <li>{t("advisor.keyStorageLocal")}</li>
        <li>{t("advisor.keyStorageProxy")}</li>
        <li className="text-mult">
          {t("advisor.keyStorageCaution")}
        </li>
      </ul>
    </section>
  );
}
