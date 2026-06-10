import { useCallback, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./RunInfo.css";
import { HANDS } from "../../constants";
import type { HandLabel } from "../../scoring/handEvaluator";
import type { HandStats } from "../../scoring/handStats";
import type { Voucher } from "../../items/vouchers";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useFocusTrap } from "../system/useFocusTrap";
import type { HandPlayCounts } from "./handPlayCounts";

type TabId = "hands" | "vouchers";

const TAB_ORDER: ReadonlyArray<TabId> = ["hands", "vouchers"];

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
  const [activeTab, setActiveTab] = useState<TabId>("hands");
  const titleId = useId();
  const tabIdPrefix = useId();
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    hands: null,
    vouchers: null,
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
      className: `run-info-tab ${selected ? "run-info-tab-active" : ""}`.trim(),
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
      className="run-info-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={handleClose}
    >
      <div className="run-info-modal" onClick={(e) => e.stopPropagation()}>
        <h2 id={titleId} className="run-info-title">
          Run Information
        </h2>
        <div
          className="run-info-tablist"
          role="tablist"
          aria-label="Run Information sections"
        >
          <button {...tabButtonProps("hands")}>Hands</button>
          <button {...tabButtonProps("vouchers")}>Vouchers</button>
        </div>
        <div className="run-info-panels">
          <div {...panelProps("hands")}>
            <table className="run-info-table">
              <thead>
                <tr>
                  <th scope="col">Hand</th>
                  <th scope="col" aria-label="Level">Lvl</th>
                  <th scope="col">Chips × Mult</th>
                  <th scope="col">Played</th>
                </tr>
              </thead>
              <tbody>
                {[...HANDS].reverse().map((hand) => {
                  const label = hand.label as HandLabel;
                  const stats = handStats[label];
                  return (
                    <tr key={label} data-testid={`run-info-row-${label}`}>
                      <th scope="row">{label}</th>
                      <td
                        className="run-info-level"
                        data-testid={`run-info-level-${label}`}
                      >
                        {stats.level}
                      </td>
                      <td data-testid={`run-info-stats-${label}`}>
                        {stats.chips} × {stats.multiplier}
                      </td>
                      <td data-testid={`run-info-count-${label}`}>
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
                className="run-info-voucher-empty"
                data-testid="run-info-voucher-empty"
              >
                No vouchers purchased yet.
              </p>
            ) : (
              <ul className="run-info-voucher-list">
                {ownedVouchers.map((voucher) => (
                  <li
                    key={voucher.id}
                    className="run-info-voucher-row"
                    data-testid={`run-info-voucher-row-${voucher.id}`}
                  >
                    <span className="run-info-voucher-name">
                      {voucher.name}
                    </span>
                    <span className="run-info-voucher-description">
                      {voucher.description}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <button
          type="button"
          className="btn btn--primary run-info-close"
          onClick={handleClose}
          autoFocus
        >
          Close
        </button>
      </div>
    </div>,
    document.body,
  );
}
