import { Suspense, lazy, useState } from "react";
import { useTranslation } from "react-i18next";
import LazyChunkSpinner from "../system/LazyChunkSpinner";

const HelpDialog = lazy(() => import("./HelpDialog"));

function Help() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn btn--ghost" onClick={() => setOpen(true)}>
        {t("sidebar.help")}
      </button>
      {open && (
        <Suspense fallback={<LazyChunkSpinner variant="overlay" />}>
          <HelpDialog onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}

export default Help;
