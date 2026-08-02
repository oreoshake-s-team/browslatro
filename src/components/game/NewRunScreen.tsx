import { useId, useRef, useState } from "react";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import DeckTooltip from "./DeckTooltip";
import { useFocusTrap } from "../system/useFocusTrap";
import { Button } from "../ui/Button";
import { cn } from "../ui/cn";
import {
  DEFAULT_STAKE,
  createStakeCatalog,
  getActiveStakes,
  getStakeSpec,
  type Stake,
} from "../../items/stakes";
import {
  DEFAULT_DECK,
  createDeckCatalog,
  type Deck,
} from "../../items/decks";
import type { VoucherId } from "../../items/vouchers";
import {
  computeStartingDiscards,
  computeStartingHands,
} from "../../run/roundSetup";

interface NewRunScreenProps {
  initialStake?: Stake;
  initialDeck?: Deck;
  onConfirm: (selection: { stake: Stake; deck: Deck }) => void;
}

const STAKES = createStakeCatalog().filter((s) => s.implemented);
const DECKS = createDeckCatalog().filter((d) => d.implemented);
const NO_VOUCHERS: ReadonlySet<VoucherId> = new Set();

const TILE =
  "flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border-2 border-transparent bg-raised px-1 py-2 text-sm font-semibold text-ink transition-colors hover:border-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const TILE_SELECTED = "border-money bg-hover";

const DECK_ACCENT: Partial<Record<Deck, string>> = {
  "red-deck": "bg-mult",
  "yellow-deck": "bg-money",
  "blue-deck": "bg-chips",
  "green-deck": "bg-success",
  "black-deck": "bg-black",
  "checkered-deck": "bg-white",
  "abandoned-deck": "bg-muted",
};

const STAKE_ACCENT: Record<Stake, string> = {
  white: "bg-white",
  red: "bg-mult",
  green: "bg-success",
  black: "bg-black",
  blue: "bg-chips",
  purple: "bg-advisor",
  orange: "bg-suit-red",
  gold: "bg-money",
};

const STAKE_TEXT: Record<Stake, string> = {
  white: "text-ink",
  red: "text-mult",
  green: "text-success",
  black: "text-muted",
  blue: "text-chips",
  purple: "text-advisor",
  orange: "text-suit-red",
  gold: "text-money",
};

export default function NewRunScreen({
  initialStake = DEFAULT_STAKE,
  initialDeck = DEFAULT_DECK,
  onConfirm,
}: NewRunScreenProps) {
  const { t } = useTranslation();
  const [stake, setStake] = useState<Stake>(initialStake);
  const [deck, setDeck] = useState<Deck>(initialDeck);
  const deckTooltipIdBase = useId();
  const overlayRef = useRef<HTMLDivElement>(null);
  useFocusTrap(overlayRef);
  const [deckTooltip, setDeckTooltip] = useState<{
    readonly id: Deck;
    readonly rect: DOMRect;
  } | null>(null);

  useEscapeToClose(() => setDeckTooltip(null), deckTooltip !== null);

  function openDeckTooltip(id: Deck, el: HTMLElement) {
    setDeckTooltip({ id, rect: el.getBoundingClientRect() });
  }

  function closeDeckTooltip(id: Deck) {
    setDeckTooltip((prev) => (prev?.id === id ? null : prev));
  }

  const resourceCtx = {
    blind: 1 as const,
    boss: null,
    ownedVoucherIds: NO_VOUCHERS,
    deck,
    jokers: [],
    stake,
  };
  const startingHands = computeStartingHands(resourceCtx);
  const startingDiscards = computeStartingDiscards(resourceCtx);

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/60 p-6 portrait-narrow:p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-run-title"
    >
      <div className="flex max-h-full w-full max-w-150 flex-col gap-5 overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-2xl">
        <div className="flex flex-wrap items-baseline justify-center gap-x-5 gap-y-3">
          <h2 id="new-run-title" className="text-center text-xl font-bold">
            {t("newRun.title")}
          </h2>
          <p
            className="inline-flex items-baseline gap-2 rounded-full border border-border bg-raised px-3 py-1 text-sm whitespace-nowrap text-muted"
            aria-label={t("a11y.startingResources")}
          >
            <span
              className="inline-flex items-baseline gap-1"
              data-testid="new-run-preview-hands"
            >
              <span
                className="text-base leading-none font-bold text-money"
                aria-live="polite"
              >
                {startingHands}
              </span>{" "}
              {t("newRun.startingHands")}
            </span>
            <span aria-hidden="true" className="font-bold">
              ·
            </span>
            <span
              className="inline-flex items-baseline gap-1"
              data-testid="new-run-preview-discards"
            >
              <span
                className="text-base leading-none font-bold text-money"
                aria-live="polite"
              >
                {startingDiscards}
              </span>{" "}
              {t("newRun.startingDiscards")}
            </span>
          </p>
        </div>
        <section
          className="flex flex-col gap-2"
          aria-labelledby="new-run-deck-label"
        >
          <h3
            id="new-run-deck-label"
            className="text-xs font-semibold tracking-widest text-muted uppercase"
          >
            {t("newRun.deck")}
          </h3>
          <div
            className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-1"
            role="radiogroup"
            aria-label={t("a11y.deckVariant")}
          >
            {DECKS.map((spec) => {
              const isSelected = spec.id === deck;
              const tooltipId = `${deckTooltipIdBase}-${spec.id}`;
              const open = deckTooltip?.id === spec.id;
              return (
                <div key={spec.id} className="flex">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={cn(TILE, isSelected && TILE_SELECTED)}
                    data-testid={`new-run-deck-${spec.id}`}
                    data-deck-tile=""
                    data-selected={isSelected || undefined}
                    aria-describedby={open ? tooltipId : undefined}
                    onMouseEnter={(e) => openDeckTooltip(spec.id, e.currentTarget)}
                    onMouseLeave={() => closeDeckTooltip(spec.id)}
                    onFocus={(e) => openDeckTooltip(spec.id, e.currentTarget)}
                    onBlur={() => closeDeckTooltip(spec.id)}
                    onClick={() => setDeck(spec.id)}
                  >
                    <span className="text-center">{spec.name}</span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-1 w-full rounded-full",
                        DECK_ACCENT[spec.id] ?? "bg-border",
                      )}
                    />
                    {open && deckTooltip && (
                      <DeckTooltip
                        id={tooltipId}
                        spec={spec}
                        anchorRect={deckTooltip.rect}
                      />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
        <section
          className="flex flex-col gap-2"
          aria-labelledby="new-run-stake-label"
        >
          <h3
            id="new-run-stake-label"
            className="text-xs font-semibold tracking-widest text-muted uppercase"
          >
            {t("newRun.stake")}
          </h3>
          <div
            className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-1"
            role="radiogroup"
            aria-label={t("a11y.stakeDifficulty")}
          >
            {STAKES.map((spec) => {
              const isSelected = spec.id === stake;
              return (
                <div key={spec.id} className="flex">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    className={cn(TILE, isSelected && TILE_SELECTED)}
                    data-testid={`new-run-stake-${spec.id}`}
                    data-selected={isSelected || undefined}
                    onClick={() => setStake(spec.id)}
                  >
                    <span className="text-center text-xs leading-tight">
                      {spec.name}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-1 w-full rounded-full",
                        STAKE_ACCENT[spec.id],
                      )}
                    />
                  </button>
                </div>
              );
            })}
          </div>
          <ul
            className="flex min-h-16 flex-col gap-1 text-sm text-muted"
            data-testid="new-run-stake-description"
            aria-live="polite"
            aria-label={t("a11y.activeStakeEffects")}
          >
            {getActiveStakes(stake).slice().reverse().map((id) => {
              const spec = getStakeSpec(id);
              const isSelected = id === stake;
              return (
                <li
                  key={id}
                  className={cn(
                    "grid grid-cols-[7rem_1fr] items-baseline gap-2 rounded-md bg-white/2 px-2 py-0.5",
                    isSelected && "bg-money/10 outline outline-money/40",
                  )}
                  data-testid={`new-run-stake-effect-${id}`}
                  data-selected={isSelected || undefined}
                >
                  <span
                    className={cn("text-right font-semibold", STAKE_TEXT[id])}
                  >
                    {spec.name}
                  </span>
                  <span>{spec.description}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <div className="flex justify-center">
          <Button
            variant="primary"
            size="lg"
            data-testid="new-run-confirm"
            onClick={() => onConfirm({ stake, deck })}
            autoFocus
          >
            {t("newRun.startRun")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
