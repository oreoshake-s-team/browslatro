import "./BlindSelectScreen.css";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import type { Blind } from "../../cards/types";
import type { BossBlind } from "../../items/bosses";
import { BASE_CHIPS, BLIND_MULTIPLIERS } from "../../constants";
import {
  describeSkipOffer,
  getTagSpec,
  type AnteSkipOffer,
  type AnteSkipOffers,
  type TagId,
} from "../../items/tags";
import { hasStakeModifier, type Stake } from "../../items/stakes";
import TagTooltip, { type TagTooltipSpec } from "./TagTooltip";

interface BlindSelectScreenProps {
  ante: number;
  currentBlind: Blind;
  boss: BossBlind;
  stake?: Stake;
  onPlay: () => void;
  onSkip?: () => void;
  tags?: ReadonlyArray<TagId>;
  skipRewards?: Partial<AnteSkipOffers>;
  bossOptions?: ReadonlyArray<BossBlind>;
  onSetBoss?: (id: string) => void;
}

const BLIND_NAMES: Readonly<Record<Blind, string>> = {
  1: "Small Blind",
  2: "Big Blind",
  3: "Boss Blind",
};

function requiredScoreFor(
  blind: Blind,
  ante: number,
  boss: BossBlind,
): number {
  const base = BASE_CHIPS[ante - 1];
  if (blind === 3) return base * boss.scoreMultiplier;
  return base * BLIND_MULTIPLIERS[blind - 1];
}

function payoutFor(blind: Blind, stake?: Stake): number {
  if (
    blind === 1 &&
    stake &&
    hasStakeModifier(stake, "red-small-blind-no-reward")
  ) {
    return 0;
  }
  return blind + 2;
}

export default function BlindSelectScreen({
  ante,
  currentBlind,
  boss,
  stake,
  onPlay,
  onSkip,
  tags = [],
  skipRewards,
  bossOptions,
  onSetBoss,
}: BlindSelectScreenProps) {
  const blinds: ReadonlyArray<Blind> = [1, 2, 3];
  const currentName = currentBlind === 3 ? boss.name : BLIND_NAMES[currentBlind];
  const canSkip = currentBlind !== 3 && Boolean(onSkip);
  const skipOfferForBlind = (blind: Blind): AnteSkipOffer | undefined =>
    blind === 1 ? skipRewards?.small : blind === 2 ? skipRewards?.big : undefined;
  const canOverrideBoss =
    bossOptions !== undefined && bossOptions.length > 0 && Boolean(onSetBoss);

  const tooltipIdBase = useId();
  const [tooltipOpenKey, setTooltipOpenKey] = useState<string | null>(null);
  const [tooltipSpec, setTooltipSpec] = useState<TagTooltipSpec | null>(null);
  const [tooltipRect, setTooltipRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (tooltipOpenKey === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setTooltipOpenKey(null);
        setTooltipSpec(null);
        setTooltipRect(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tooltipOpenKey]);

  function openTooltip(key: string, spec: TagTooltipSpec, el: HTMLElement) {
    setTooltipOpenKey(key);
    setTooltipSpec(spec);
    setTooltipRect(el.getBoundingClientRect());
  }

  function closeTooltip(key: string) {
    setTooltipOpenKey((prev) => {
      if (prev === key) {
        setTooltipSpec(null);
        setTooltipRect(null);
        return null;
      }
      return prev;
    });
  }

  return createPortal(
    <div
      className="blind-select-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="blind-select-title"
    >
      <div className="blind-select-modal" onClick={(e) => e.stopPropagation()}>
        <h2 id="blind-select-title" className="blind-select-title">
          Ante {ante}
        </h2>
        {tags.length > 0 && (
          <ul
            className="blind-select-tags"
            aria-label="Tags held"
            data-testid="blind-select-tags"
          >
            {tags.map((id, idx) => {
              const spec = getTagSpec(id);
              const key = `held-${idx}`;
              const tooltipId = `${tooltipIdBase}-${key}`;
              const open = tooltipOpenKey === key;
              return (
                <li
                  key={`${id}-${idx}`}
                  className="blind-select-tag"
                  data-testid={`blind-select-tag-${idx}`}
                  data-tag-id={id}
                  tabIndex={0}
                  aria-describedby={open ? tooltipId : undefined}
                  onMouseEnter={(e) => openTooltip(key, spec, e.currentTarget)}
                  onMouseLeave={() => closeTooltip(key)}
                  onFocus={(e) => openTooltip(key, spec, e.currentTarget)}
                  onBlur={() => closeTooltip(key)}
                >
                  <span className="blind-select-tag-name">{spec.name}</span>
                  <span className="blind-select-tag-description">
                    {spec.description}
                  </span>
                  {open && tooltipRect && tooltipSpec && (
                    <TagTooltip
                      id={tooltipId}
                      spec={tooltipSpec}
                      anchorRect={tooltipRect}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <ul className="blind-select-rows" aria-label="Blinds for this ante">
          {blinds.map((b) => {
            const isCurrent = b === currentBlind;
            const isCompleted = b < currentBlind;
            const name = b === 3 ? boss.name : BLIND_NAMES[b];
            const rowSkipOffer = skipOfferForBlind(b);
            const rowSkipSpec = rowSkipOffer ? describeSkipOffer(rowSkipOffer) : null;
            const skipKey = `skip-${b}`;
            const skipTooltipId = `${tooltipIdBase}-${skipKey}`;
            const skipTooltipOpen = tooltipOpenKey === skipKey;
            const stateClass = isCurrent
              ? " blind-select-row-current"
              : isCompleted
                ? " blind-select-row-completed"
                : " blind-select-row-upcoming";
            return (
              <li
                key={b}
                className={`blind-select-row${stateClass}`}
                data-testid={`blind-select-row-${b}`}
                data-blind-state={
                  isCurrent ? "current" : isCompleted ? "completed" : "upcoming"
                }
              >
                {b === 3 && canOverrideBoss ? (
                  <select
                    className="blind-select-row-name blind-select-boss-override"
                    data-testid="blind-select-boss-override"
                    aria-label="Override boss for this ante (dev)"
                    value={boss.id}
                    onChange={(e) => onSetBoss?.(e.target.value)}
                  >
                    {bossOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="blind-select-row-name">{name}</span>
                )}
                {b === 3 && (
                  <span
                    className="blind-select-row-boss-description"
                    data-testid="blind-select-boss-description"
                  >
                    {boss.description}
                  </span>
                )}
                <dl className="blind-select-row-stats">
                  <div className="blind-select-row-stat">
                    <dt>Score at least</dt>
                    <dd data-testid={`blind-select-required-${b}`}>
                      {requiredScoreFor(b, ante, boss)}
                    </dd>
                  </div>
                  <div className="blind-select-row-stat">
                    <dt>Payout</dt>
                    <dd data-testid={`blind-select-payout-${b}`}>
                      ${payoutFor(b, stake)}
                    </dd>
                  </div>
                </dl>
                {b !== 3 && rowSkipSpec && (
                  <div
                    className="blind-select-row-skip-reward"
                    data-testid={`blind-select-row-skip-reward-${b}`}
                    tabIndex={0}
                    aria-describedby={
                      skipTooltipOpen ? skipTooltipId : undefined
                    }
                    onMouseEnter={(e) =>
                      openTooltip(skipKey, rowSkipSpec, e.currentTarget)
                    }
                    onMouseLeave={() => closeTooltip(skipKey)}
                    onFocus={(e) =>
                      openTooltip(skipKey, rowSkipSpec, e.currentTarget)
                    }
                    onBlur={() => closeTooltip(skipKey)}
                  >
                    <span className="blind-select-row-skip-reward-label">
                      Skip reward
                    </span>
                    <span className="blind-select-row-skip-reward-name">
                      + {rowSkipSpec.name}
                    </span>
                    {skipTooltipOpen && tooltipRect && tooltipSpec && (
                      <TagTooltip
                        id={skipTooltipId}
                        spec={tooltipSpec}
                        anchorRect={tooltipRect}
                      />
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="blind-select-actions">
          <button
            type="button"
            className="blind-select-play"
            data-testid="blind-select-play"
            onClick={onPlay}
            autoFocus
          >
            Play {currentName} →
          </button>
          {canSkip && (
            <button
              type="button"
              className="blind-select-skip"
              data-testid="blind-select-skip"
              onClick={onSkip}
              aria-label={`Skip ${currentName} (no reward, no penalty)`}
            >
              Skip
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
