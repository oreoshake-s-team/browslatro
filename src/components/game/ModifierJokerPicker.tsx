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
  type JokerRarity,
} from "../../items/jokers";
import { sortByDisplayName } from "./displayNameSort";
import { Button } from "../ui/Button";
import { cn } from "../ui/cn";
import JokerTooltip from "../jokers/JokerTooltip";

const PAGE_SIZE = 12;

const TILE_BASE =
  "relative inline-flex cursor-pointer items-center gap-1 rounded-md border border-solid px-2 py-1 text-left text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-45";

const TILE_RARITY: Record<JokerRarity, string> = {
  common: "border-chips/40 bg-chips/10 text-chips enabled:hover:bg-chips/20",
  uncommon:
    "border-success/40 bg-success/10 text-success enabled:hover:bg-success/20",
  rare: "border-mult/40 bg-mult/10 text-mult enabled:hover:bg-mult/20",
  legendary:
    "border-money/40 bg-money/10 text-money enabled:hover:bg-money/20",
};

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
    <details
      data-testid="modifier-joker-picker"
      className="w-full rounded-lg border border-dashed border-muted/40 bg-white/5 px-3 pb-3 pt-2"
      ref={detailsRef}
    >
      <summary className="cursor-pointer select-none py-1 text-xs font-bold uppercase tracking-wider text-muted hover:text-ink">
        Add a specific Joker
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        <div className="grid grid-cols-4 gap-1">
          {sortedCatalog
            .slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
            .map((joker) => {
              const tooltipId = `${tooltipIdBase}-${joker.id}`;
              const open = tooltip?.id === joker.id;
              return (
                <button
                  key={joker.id}
                  type="button"
                  className={cn(TILE_BASE, TILE_RARITY[joker.rarity])}
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
          className="flex items-center justify-center gap-2"
          aria-label={t("a11y.jokerPickerPagination")}
        >
          <Button
            size="sm"
            data-testid="modifier-joker-picker-prev"
            aria-label={t("a11y.prevJokerPage")}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </Button>
          <span
            className="min-w-14 text-center text-xs font-semibold text-muted"
            data-testid="modifier-joker-picker-page-label"
            aria-live="polite"
          >
            Page {page} / {totalPages}
          </span>
          <Button
            size="sm"
            data-testid="modifier-joker-picker-next"
            aria-label={t("a11y.nextJokerPage")}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </Button>
        </nav>
      </div>
    </details>
  );
}
