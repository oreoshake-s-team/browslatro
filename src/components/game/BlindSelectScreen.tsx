import "./BlindSelectScreen.css";
import { useId, useState } from "react";
import { useEscapeToClose } from "../system/useEscapeToClose";
import { useTranslation } from "react-i18next";
import type { Blind } from "../../cards/types";
import type { BossBlind } from "../../items/bosses";
import { requiredChipsForBlind } from "../../scoring/anteScaling";
import {
  describeSkipOffer,
  getTagSpec,
  type AnteSkipOffer,
  type AnteSkipOffers,
  type TagId,
} from "../../items/tags";
import { hasStakeModifier, type Stake } from "../../items/stakes";
import TagTooltip, { type TagTooltipSpec } from "./TagTooltip";
import Modal from "../system/Modal";

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
  onRerollBoss?: () => void;
  bossRerollsRemaining?: number;
  bossRerollCost?: number;
  canAffordBossReroll?: boolean;
}

const BLIND_NAME_KEYS = {
  1: "blinds.smallBlind",
  2: "blinds.bigBlind",
  3: "blinds.bossBlind",
} as const satisfies Record<Blind, string>;


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
  onRerollBoss,
  bossRerollsRemaining,
  bossRerollCost,
  canAffordBossReroll,
}: BlindSelectScreenProps) {
  const { t } = useTranslation();
  const blinds: ReadonlyArray<Blind> = [1, 2, 3];
  const currentName =
    currentBlind === 3 ? boss.name : t(BLIND_NAME_KEYS[currentBlind]);
  const canSkip = currentBlind !== 3 && Boolean(onSkip);
  const skipOfferForBlind = (blind: Blind): AnteSkipOffer | undefined =>
    blind === 1 ? skipRewards?.small : blind === 2 ? skipRewards?.big : undefined;
  const canOverrideBoss =
    bossOptions !== undefined && bossOptions.length > 0 && Boolean(onSetBoss);
  const showRerollBoss =
    onRerollBoss !== undefined &&
    bossRerollsRemaining !== undefined &&
    bossRerollsRemaining > 0;

  const tooltipIdBase = useId();
  const [tooltip, setTooltip] = useState<{
    readonly key: string;
    readonly spec: TagTooltipSpec;
    readonly rect: DOMRect;
  } | null>(null);

  useEscapeToClose(() => setTooltip(null), tooltip !== null);

  function openTooltip(key: string, spec: TagTooltipSpec, el: HTMLElement) {
    setTooltip({ key, spec, rect: el.getBoundingClientRect() });
  }

  function closeTooltip(key: string) {
    setTooltip((prev) => (prev?.key === key ? null : prev));
  }

  return (
    <Modal
      onClose={() => {}}
      labelledBy="blind-select-title"
      accent="boss-blind"
      size="lg"
      level="elevated"
      closeOnEscape={false}
      closeOnBackdrop={false}
      className="blind-select-modal"
    >
        <h2 id="blind-select-title" className="blind-select-title">
          {t("blinds.anteHeading", { ante })}
        </h2>
        {tags.length > 0 && (
          <ul
            className="blind-select-tags"
            aria-label={t("a11y.tagsHeld")}
            data-testid="blind-select-tags"
          >
            {tags.map((id, idx) => {
              const spec = getTagSpec(id);
              const key = `held-${idx}`;
              const tooltipId = `${tooltipIdBase}-${key}`;
              const open = tooltip?.key === key;
              return (
                <li
                  key={`${id}-${idx}`}
                  className="blind-select-tag"
                  data-testid={`blind-select-tag-${idx}`}
                  data-tag-id={id}
                  aria-describedby={open ? tooltipId : undefined}
                  onMouseEnter={(e) => openTooltip(key, spec, e.currentTarget)}
                  onMouseLeave={() => closeTooltip(key)}
                >
                  <span className="blind-select-tag-name">{spec.name}</span>
                  <span className="blind-select-tag-description">
                    {spec.description}
                  </span>
                  {open && tooltip && (
                    <TagTooltip
                      id={tooltipId}
                      spec={tooltip.spec}
                      anchorRect={tooltip.rect}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <ul className="blind-select-rows" aria-label={t("a11y.blindsForAnte")}>
          {blinds.map((b) => {
            const isCurrent = b === currentBlind;
            const isCompleted = b < currentBlind;
            const name = b === 3 ? boss.name : t(BLIND_NAME_KEYS[b]);
            const rowSkipOffer = skipOfferForBlind(b);
            const rowSkipSpec = rowSkipOffer ? describeSkipOffer(rowSkipOffer) : null;
            const skipKey = `skip-${b}`;
            const skipTooltipId = `${tooltipIdBase}-${skipKey}`;
            const skipTooltipOpen = tooltip?.key === skipKey;
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
                    aria-label={t("a11y.overrideBossDev")}
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
                {b === 3 && showRerollBoss && (
                  <button
                    type="button"
                    className="btn blind-select-boss-reroll"
                    data-testid="blind-select-boss-reroll"
                    onClick={onRerollBoss}
                    disabled={canAffordBossReroll === false}
                    aria-label={
                      canAffordBossReroll === false
                        ? t("a11y.rerollBossNotEnough", { cost: bossRerollCost ?? 10 })
                        : t("blinds.rerollBoss", { cost: bossRerollCost ?? 10 })
                    }
                  >
                    {t("blinds.rerollBoss", { cost: bossRerollCost ?? 10 })}
                  </button>
                )}
                <dl className="blind-select-row-stats">
                  <div className="blind-select-row-stat">
                    <dt>{t("blinds.scoreAtLeast")}</dt>
                    <dd data-testid={`blind-select-required-${b}`}>
                      {requiredChipsForBlind({ ante, blind: b, boss, stake })}
                    </dd>
                  </div>
                  <div className="blind-select-row-stat">
                    <dt>{t("blinds.payout")}</dt>
                    <dd data-testid={`blind-select-payout-${b}`}>
                      ${payoutFor(b, stake)}
                    </dd>
                  </div>
                </dl>
                {b !== 3 && rowSkipSpec && (
                  <div
                    className="blind-select-row-skip-reward"
                    data-testid={`blind-select-row-skip-reward-${b}`}
                    aria-describedby={
                      skipTooltipOpen ? skipTooltipId : undefined
                    }
                    onMouseEnter={(e) =>
                      openTooltip(skipKey, rowSkipSpec, e.currentTarget)
                    }
                    onMouseLeave={() => closeTooltip(skipKey)}
                  >
                    <span className="blind-select-row-skip-reward-label">
                      {t("blinds.skipReward")}
                    </span>
                    <span className="blind-select-row-skip-reward-name">
                      + {rowSkipSpec.name}
                    </span>
                    {skipTooltipOpen && tooltip && (
                      <TagTooltip
                        id={skipTooltipId}
                        spec={tooltip.spec}
                        anchorRect={tooltip.rect}
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
            className="btn btn--primary blind-select-play"
            data-testid="blind-select-play"
            onClick={onPlay}
            autoFocus
          >
            {t("blinds.play", { blind: currentName })}
          </button>
          {canSkip && (
            <button
              type="button"
              className="btn btn--ghost blind-select-skip"
              data-testid="blind-select-skip"
              onClick={onSkip}
              aria-label={t("a11y.skipBlind", { blind: currentName })}
            >
              {t("blinds.skip")}
            </button>
          )}
        </div>
    </Modal>
  );
}
