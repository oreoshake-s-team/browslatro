import { Suspense, lazy, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import LazyChunkSpinner from "../system/LazyChunkSpinner";

const HelpDialog = lazy(() => import("./HelpDialog"));

function Help() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        {t("sidebar.help")}
      </Button>
      {open && (
        <Suspense fallback={<LazyChunkSpinner variant="overlay" />}>
          <HelpDialog onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}

export default Help;
