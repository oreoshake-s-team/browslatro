import { useTranslation } from "react-i18next";
import "./KeyStorageDisclosure.css";

export default function KeyStorageDisclosure(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <section
      className="key-storage-disclosure"
      aria-label={t("advisor.keyStorageTitle")}
      data-testid="key-storage-disclosure"
    >
      <p className="key-storage-disclosure-title">
        {t("advisor.keyStorageTitle")}
      </p>
      <ul className="key-storage-disclosure-list">
        <li>{t("advisor.keyStorageLocal")}</li>
        <li>{t("advisor.keyStorageProxy")}</li>
        <li className="key-storage-disclosure-caution">
          {t("advisor.keyStorageCaution")}
        </li>
      </ul>
    </section>
  );
}
