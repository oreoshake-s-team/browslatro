import "./ModifierJokerPicker.css";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useTranslation } from "react-i18next";
import { useGame } from "../../store/game";
import { jokerCapacityFor } from "../../items/capacities";
import { play } from "../system/sounds";
import {
  createJokerCatalog,
  createLegendaryJokerCatalog,
  effectiveJokerCount,
  type Joker,
} from "../../items/jokers";
import { sortByDisplayName } from "./displayNameSort";
import JokerTooltip from "../jokers/JokerTooltip";

const PAGE_SIZE = 12;

export default function ModifierJokerPicker() {
  const { t } = useTranslation();
  const jokers = useGame((s) => s.jokers);
  const setJokers = useGame((s) => s.setJokers);
  const refreshCelestialPricing = useGame((s) => s.refreshCelestialPricing);
  const ownedVoucherIds = useGame((s) => s.ownedVoucherIds);
  const selectedDeck = useGame((s) => s.selectedDeck);
  const capacity = jokerCapacityFor(ownedVoucherIds, selectedDeck);
  const isFull = effectiveJokerCount(jokers) >= capacity;

  const sortedCatalog = useMemo<ReadonlyArray<Joker>>(
    () =>
      sortByDisplayName(
        [...createJokerCatalog(), ...createLegendaryJokerCatalog()],
        (j) => j.name,
      ),
    [],
  );
  const totalPages = Math.max(1, Math.ceil(sortedCatalog.length / PAGE_SIZE));
  const [page, setPage] = useState(1);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const el = detailsRef.current;
    if (!el) return;
    const onToggle = () => {
      if (el.open) setPage(1);
    };
    el.addEventListener("toggle", onToggle);
    return () => el.removeEventListener("toggle", onToggle);
  }, []);

  const tooltipIdBase = useId();
  const [tooltip, setTooltip] = useState<{
    readonly id: string;
    readonly rect: DOMRect;
  } | null>(null);
  useEscapeToClose(() => setTooltip(null), tooltip !== null);

  const openTip = (id: string, el: HTMLElement) =>
    setTooltip({ id, rect: el.getBoundingClientRect() });
  const closeTip = (id: string) =>
    setTooltip((prev) => (prev?.id === id ? null : prev));

  function addJoker(joker: Joker) {
    if (isFull) return;
    play("pop");
    setJokers((prev) => [...prev, { ...joker }]);
    refreshCelestialPricing();
  }

  return (
    <details className="modifier-joker-picker" ref={detailsRef}>
      <summary className="modifier-joker-picker-summary">
        Add a specific Joker
      </summary>
      <div className="modifier-joker-picker-body">
        <div className="modifier-joker-picker-grid">
          {sortedCatalog
            .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
            .map((joker) => {
              const tooltipId = `${tooltipIdBase}-${joker.id}`;
              const open = tooltip?.id === joker.id;
              return (
                <button
                  key={joker.id}
                  type="button"
                  className={`add-joker-button add-joker-button-${joker.rarity}`}
                  data-joker-id={joker.id}
                  disabled={isFull}
                  aria-disabled={isFull}
                  aria-describedby={open ? tooltipId : undefined}
                  onMouseEnter={(e) => openTip(joker.id, e.currentTarget)}
                  onMouseLeave={() => closeTip(joker.id)}
                  onFocus={(e) => openTip(joker.id, e.currentTarget)}
                  onBlur={() => closeTip(joker.id)}
                  onClick={() => addJoker(joker)}
                >
                  <span aria-hidden="true">🃏 </span>
                  {joker.name}
                  {open && tooltip && (
                    <JokerTooltip
                      id={tooltipId}
                      joker={joker}
                      anchorRect={tooltip.rect}
                    />
                  )}
                </button>
              );
            })}
        </div>
        <nav
          className="modifier-joker-picker-nav"
          aria-label={t("a11y.jokerPickerPagination")}
        >
          <button
            type="button"
            className="modifier-joker-picker-prev"
            data-testid="modifier-joker-picker-prev"
            aria-label={t("a11y.prevJokerPage")}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </button>
          <span
            className="modifier-joker-picker-page-label"
            data-testid="modifier-joker-picker-page-label"
            aria-live="polite"
          >
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            className="modifier-joker-picker-next"
            data-testid="modifier-joker-picker-next"
            aria-label={t("a11y.nextJokerPage")}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </button>
        </nav>
      </div>
    </details>
  );
}
