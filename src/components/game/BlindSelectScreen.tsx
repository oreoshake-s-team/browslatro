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
import { Button } from "../ui/Button";
import { cn } from "../ui/cn";

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

const ROW_STATE = {
  current: "border-money bg-money/10 ring-2 ring-money/30",
  completed: "border-border bg-raised opacity-50",
  upcoming: "border-border bg-raised opacity-85",
} as const;

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
    >
      <div className="flex min-h-0 flex-col gap-6">
        <h2
          id="blind-select-title"
          className="text-base font-bold tracking-widest text-muted uppercase"
        >
          {t("blinds.anteHeading", { ante })}
        </h2>
        {tags.length > 0 && (
          <ul
            className="flex flex-wrap gap-3"
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
                  className="flex flex-col gap-0.5 rounded-2xl border border-success bg-success/10 px-4 py-2"
                  data-testid={`blind-select-tag-${idx}`}
                  data-tag-id={id}
                  aria-describedby={open ? tooltipId : undefined}
                  onMouseEnter={(e) => openTooltip(key, spec, e.currentTarget)}
                  onMouseLeave={() => closeTooltip(key)}
                >
                  <span className="text-sm font-bold text-success">
                    {spec.name}
                  </span>
                  <span className="text-xs text-muted">{spec.description}</span>
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
        <ul
          className="grid flex-1 grid-cols-[repeat(auto-fit,minmax(18rem,1fr))] gap-4"
          aria-label={t("a11y.blindsForAnte")}
        >
          {blinds.map((b) => {
            const isCurrent = b === currentBlind;
            const isCompleted = b < currentBlind;
            const blindState = isCurrent
              ? "current"
              : isCompleted
                ? "completed"
                : "upcoming";
            const name = b === 3 ? boss.name : t(BLIND_NAME_KEYS[b]);
            const rowSkipOffer = skipOfferForBlind(b);
            const rowSkipSpec = rowSkipOffer ? describeSkipOffer(rowSkipOffer) : null;
            const skipKey = `skip-${b}`;
            const skipTooltipId = `${tooltipIdBase}-${skipKey}`;
            const skipTooltipOpen = tooltip?.key === skipKey;
            return (
              <li
                key={b}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border-2 p-5",
                  ROW_STATE[blindState],
                )}
                data-testid={`blind-select-row-${b}`}
                data-blind-state={blindState}
              >
                {b === 3 && canOverrideBoss ? (
                  <select
                    className="cursor-pointer rounded-md border border-border bg-white/5 px-2 py-1 text-xl font-bold text-ink hover:border-mult focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
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
                  <span className="text-xl font-bold">{name}</span>
                )}
                {b === 3 && (
                  <span
                    className="text-sm text-muted italic"
                    data-testid="blind-select-boss-description"
                  >
                    {boss.description}
                  </span>
                )}
                {b === 3 && showRerollBoss && (
                  <Button
                    size="sm"
                    className="self-start border-mult bg-mult/15 text-ink hover:bg-mult/30"
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
                  </Button>
                )}
                <dl className="flex flex-col gap-2">
                  <div className="flex justify-between gap-2 text-sm">
                    <dt className="text-muted">{t("blinds.scoreAtLeast")}</dt>
                    <dd
                      className="font-bold tabular-nums"
                      data-testid={`blind-select-required-${b}`}
                    >
                      {requiredChipsForBlind({ ante, blind: b, boss, stake })}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 text-sm">
                    <dt className="text-muted">{t("blinds.payout")}</dt>
                    <dd
                      className="font-bold tabular-nums"
                      data-testid={`blind-select-payout-${b}`}
                    >
                      ${payoutFor(b, stake)}
                    </dd>
                  </div>
                </dl>
                {b !== 3 && rowSkipSpec && (
                  <div
                    className="mt-1 flex cursor-help flex-col gap-0.5 rounded-lg border border-dashed border-success bg-success/10 px-3 py-2"
                    data-testid={`blind-select-row-skip-reward-${b}`}
                    aria-describedby={
                      skipTooltipOpen ? skipTooltipId : undefined
                    }
                    onMouseEnter={(e) =>
                      openTooltip(skipKey, rowSkipSpec, e.currentTarget)
                    }
                    onMouseLeave={() => closeTooltip(skipKey)}
                  >
                    <span className="text-xs tracking-wider text-ink uppercase">
                      {t("blinds.skipReward")}
                    </span>
                    <span className="text-sm font-bold text-success">
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
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="primary"
            size="lg"
            data-testid="blind-select-play"
            onClick={onPlay}
            autoFocus
          >
            {t("blinds.play", { blind: currentName })}
          </Button>
          {canSkip && (
            <Button
              variant="ghost"
              data-testid="blind-select-skip"
              onClick={onSkip}
              aria-label={t("a11y.skipBlind", { blind: currentName })}
            >
              {t("blinds.skip")}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
