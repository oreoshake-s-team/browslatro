import { Suspense, lazy, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../ui/Button";
import type { HandStats } from "../../scoring/handStats";
import type { Voucher } from "../../items/vouchers";
import type { HandPlayCounts } from "./handPlayCounts";
import LazyChunkSpinner from "../system/LazyChunkSpinner";

export { emptyHandCounts, type HandPlayCounts } from "./handPlayCounts";

const RunInfoDialog = lazy(() => import("./RunInfoDialog"));

interface RunInfoProps {
  handPlayCounts: HandPlayCounts;
  handStats: HandStats;
  ownedVouchers?: ReadonlyArray<Voucher>;
}

function RunInfo({
  handPlayCounts,
  handStats,
  ownedVouchers = [],
}: RunInfoProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        {t("sidebar.runInfo")}
      </Button>
      {open && (
        <Suspense fallback={<LazyChunkSpinner variant="overlay" />}>
          <RunInfoDialog
            handPlayCounts={handPlayCounts}
            handStats={handStats}
            ownedVouchers={ownedVouchers}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}

export default RunInfo;
