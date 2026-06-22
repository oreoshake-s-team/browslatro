import { Suspense, lazy, useCallback, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { ScoringEvent } from "../../scoring/scoringTrace";
import LazyChunkSpinner from "../system/LazyChunkSpinner";

const ScoringTraceModal = lazy(() => import("./ScoringTraceModal"));

interface ScoringTraceButtonProps {
  readonly events: ReadonlyArray<ScoringEvent>;
  readonly className: string;
  readonly children: ReactNode;
}

export default function ScoringTraceButton({
  events,
  className,
  children,
}: ScoringTraceButtonProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const open = useCallback(() => setIsExpanded(true), []);
  const close = useCallback(() => setIsExpanded(false), []);
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={open}
        aria-haspopup="dialog"
        title={t("a11y.expandScoringTrace")}
      >
        {children}
      </button>
      {isExpanded ? (
        <Suspense fallback={<LazyChunkSpinner variant="overlay" />}>
          <ScoringTraceModal events={events} onClose={close} />
        </Suspense>
      ) : null}
    </>
  );
}
