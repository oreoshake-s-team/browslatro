import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const badge = cva(
  "inline-flex items-center justify-center rounded-full border border-black/20 px-1.5 py-0.5 text-xs leading-none font-bold",
  {
    variants: {
      tone: {
        neutral: "bg-hover text-ink",
        money: "bg-money text-black",
        chips: "bg-chips text-white",
        mult: "bg-mult text-white",
        success: "bg-success text-black",
        advisor: "bg-advisor text-white",
        muted: "bg-muted text-bg",
      },
      struck: {
        true: "line-through opacity-85",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badge>;

export function Badge({ className, tone, struck, ...props }: BadgeProps) {
  return <span className={cn(badge({ tone, struck }), className)} {...props} />;
}

const scorePill = cva(
  "inline-flex min-w-14 items-center justify-center rounded-lg px-3 py-1.5 text-xl font-bold text-white tabular-nums",
  {
    variants: {
      tone: {
        chips: "bg-chips",
        mult: "bg-mult",
      },
    },
  },
);

type ScorePillProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof scorePill> & { readonly tone: "chips" | "mult" };

export function ScorePill({ className, tone, ...props }: ScorePillProps) {
  return <span className={cn(scorePill({ tone }), className)} {...props} />;
}
