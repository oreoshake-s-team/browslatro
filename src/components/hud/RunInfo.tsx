import { Suspense, lazy, useState } from "react";
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
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn btn--ghost" onClick={() => setOpen(true)}>
        Run info
      </button>
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
