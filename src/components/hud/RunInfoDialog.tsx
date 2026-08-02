import { useCallback, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { tHandLabel } from "../../i18n/handLabels";
import { HANDS } from "../../constants";
import type { HandLabel } from "../../scoring/handEvaluator";
import type { HandStats } from "../../scoring/handStats";
import type { Voucher } from "../../items/vouchers";
import { getDeckSpec } from "../../items/decks";
import { getStakeSpec, STAKE_ORDER } from "../../items/stakes";
import { useGame } from "../../store/game";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useFocusTrap } from "../system/useFocusTrap";
import { Button } from "../ui/Button";
import { cn } from "../ui/cn";
import type { HandPlayCounts } from "./handPlayCounts";

type TabId = "hands" | "vouchers" | "deck";

const TAB_ORDER: ReadonlyArray<TabId> = ["hands", "vouchers", "deck"];

const headerCellClass =
  "border-b border-border px-1.5 py-1 text-left text-xs font-bold tracking-wider text-muted uppercase";
const bodyCellClass = "px-1.5 py-1 text-muted";

interface RunInfoDialogProps {
  handPlayCounts: HandPlayCounts;
  handStats: HandStats;
  ownedVouchers: ReadonlyArray<Voucher>;
  onClose: () => void;
}

export default function RunInfoDialog({
  handPlayCounts,
  handStats,
  ownedVouchers,
  onClose,
}: RunInfoDialogProps) {
  const { t } = useTranslation();
  const selectedDeck = useGame((s) => s.selectedDeck);
  const selectedStake = useGame((s) => s.selectedStake);
  const deckSpec = getDeckSpec(selectedDeck);
  const [activeTab, setActiveTab] = useState<TabId>("hands");
  const titleId = useId();
  const tabIdPrefix = useId();
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    hands: null,
    vouchers: null,
    deck: null,
  });

  const handleClose = useCallback(() => onClose(), [onClose]);
  useEscapeToClose(handleClose, true);
  const overlayRef = useRef<HTMLDivElement>(null);
  useFocusTrap(overlayRef);

  function selectTab(tab: TabId) {
    setActiveTab(tab);
    tabRefs.current[tab]?.focus();
  }

  function handleTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    const currentIdx = TAB_ORDER.indexOf(activeTab);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      selectTab(TAB_ORDER[(currentIdx + 1) % TAB_ORDER.length]);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      selectTab(
        TAB_ORDER[(currentIdx - 1 + TAB_ORDER.length) % TAB_ORDER.length],
      );
    } else if (e.key === "Home") {
      e.preventDefault();
      selectTab(TAB_ORDER[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      selectTab(TAB_ORDER[TAB_ORDER.length - 1]);
    }
  }

  function tabButtonProps(tab: TabId) {
    const selected = activeTab === tab;
    return {
      type: "button" as const,
      role: "tab" as const,
      id: `${tabIdPrefix}-tab-${tab}`,
      "aria-selected": selected,
      "aria-controls": `${tabIdPrefix}-panel-${tab}`,
      tabIndex: selected ? 0 : -1,
      className: cn(
        "-mb-px cursor-pointer border-b-2 px-2.5 py-1.5 text-sm font-semibold focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
        selected
          ? "border-chips text-chips"
          : "border-transparent text-muted hover:text-chips",
      ),
      onClick: () => selectTab(tab),
      onKeyDown: handleTabKeyDown,
      ref: (el: HTMLButtonElement | null) => {
        tabRefs.current[tab] = el;
      },
    };
  }

  function panelProps(tab: TabId) {
    return {
      role: "tabpanel" as const,
      id: `${tabIdPrefix}-panel-${tab}`,
      "aria-labelledby": `${tabIdPrefix}-tab-${tab}`,
      hidden: activeTab !== tab,
    };
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={handleClose}
    >
      <div
        className="flex max-h-[80vh] min-w-[22rem] max-w-[36rem] flex-col gap-3 overflow-y-auto rounded-xl border-2 border-border bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-center text-lg font-bold text-ink">
          {t("runInfo.title")}
        </h2>
        <div
          className="flex gap-1 border-b border-border"
          role="tablist"
          aria-label={t("a11y.runInfoSections")}
        >
          <button {...tabButtonProps("hands")}>{t("runInfo.handsTab")}</button>
          <button {...tabButtonProps("vouchers")}>
            {t("runInfo.vouchersTab")}
          </button>
          <button {...tabButtonProps("deck")}>{t("runInfo.deckTab")}</button>
        </div>
        <div>
          <div {...panelProps("hands")}>
            <table
              className="w-full border-collapse text-sm"
              data-testid="run-info-table"
            >
              <thead>
                <tr>
                  <th scope="col" className={headerCellClass}>
                    {t("runInfo.handHeader")}
                  </th>
                  <th
                    scope="col"
                    className={headerCellClass}
                    aria-label={t("a11y.level")}
                  >
                    {t("runInfo.levelHeader")}
                  </th>
                  <th scope="col" className={headerCellClass}>
                    {t("runInfo.chipsTimesMult")}
                  </th>
                  <th scope="col" className={cn(headerCellClass, "text-right")}>
                    {t("runInfo.playedHeader")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...HANDS].reverse().map((hand) => {
                  const label = hand.label as HandLabel;
                  const stats = handStats[label];
                  return (
                    <tr
                      key={label}
                      className="border-t border-border"
                      data-testid={`run-info-row-${label}`}
                    >
                      <th
                        scope="row"
                        className="px-1.5 py-1 text-left font-semibold text-ink"
                      >
                        {tHandLabel(t, label)}
                      </th>
                      <td
                        className={cn(
                          bodyCellClass,
                          "text-center font-semibold text-chips tabular-nums",
                        )}
                        data-testid={`run-info-level-${label}`}
                      >
                        {stats.level}
                      </td>
                      <td
                        className={bodyCellClass}
                        data-testid={`run-info-stats-${label}`}
                      >
                        {stats.chips} × {stats.multiplier}
                      </td>
                      <td
                        className={cn(bodyCellClass, "text-right")}
                        data-testid={`run-info-count-${label}`}
                      >
                        {handPlayCounts[label]}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div {...panelProps("vouchers")}>
            {ownedVouchers.length === 0 ? (
              <p
                className="p-2 text-center text-muted italic"
                data-testid="run-info-voucher-empty"
              >
                {t("runInfo.noVouchers")}
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {ownedVouchers.map((voucher) => (
                  <li
                    key={voucher.id}
                    className="flex flex-col gap-0.5 rounded-md border border-border bg-raised px-2 py-1"
                    data-testid={`run-info-voucher-row-${voucher.id}`}
                  >
                    <span className="font-semibold text-ink">
                      {voucher.name}
                    </span>
                    <span className="text-sm text-muted">
                      {voucher.description}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div {...panelProps("deck")} className="flex flex-col gap-3">
            <section className="flex flex-col gap-1">
              <h3 className="text-xs font-bold tracking-wider text-muted uppercase">
                {t("runInfo.deckHeading")}
              </h3>
              <p
                className="font-bold text-ink"
                data-testid="run-info-deck-name"
              >
                {deckSpec.name}
              </p>
              <p className="text-sm text-muted">{deckSpec.description}</p>
            </section>
            <section className="flex flex-col gap-1">
              <h3 className="text-xs font-bold tracking-wider text-muted uppercase">
                {t("runInfo.stakeLadderHeading")}
              </h3>
              <ul className="flex flex-col gap-1">
                {STAKE_ORDER.map((stakeId) => {
                  const spec = getStakeSpec(stakeId);
                  const current = stakeId === selectedStake;
                  return (
                    <li
                      key={stakeId}
                      className={cn(
                        "flex flex-col gap-0.5 rounded-md bg-raised px-2 py-1",
                        current && "outline-2 outline-chips",
                      )}
                      data-testid={`run-info-stake-row-${stakeId}`}
                      aria-current={current ? "true" : undefined}
                    >
                      <span className="font-semibold text-ink">
                        {spec.name}
                        {current && (
                          <span className="font-semibold text-chips">
                            {" "}
                            {t("runInfo.currentStakeMarker")}
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-muted">
                        {spec.description}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </div>
        <Button
          variant="primary"
          size="lg"
          className="self-center"
          onClick={handleClose}
          autoFocus
        >
          {t("runInfo.close")}
        </Button>
      </div>
    </div>,
    document.body,
  );
}
