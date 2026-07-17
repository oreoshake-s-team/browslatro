import { useTranslation } from "react-i18next";

export default function KeyStorageDisclosure(): React.JSX.Element {
  const { t } = useTranslation();
  return (
    <section
      className="rounded-md border border-solid border-accent-orange-light bg-accent-orange-pale px-[0.7rem] py-2"
      aria-label={t("advisor.keyStorageTitle")}
      data-testid="key-storage-disclosure"
    >
      <p className="m-0 mb-[0.3rem] text-[0.8rem] font-bold text-shop-muted-on-light">
        {t("advisor.keyStorageTitle")}
      </p>
      <ul className="m-0 space-y-1 pl-[1.1rem] text-[0.78rem] leading-[1.4] text-text-on-light-muted">
        <li>{t("advisor.keyStorageLocal")}</li>
        <li>{t("advisor.keyStorageProxy")}</li>
        <li className="text-accent-red-deep">
          {t("advisor.keyStorageCaution")}
        </li>
      </ul>
    </section>
  );
}
