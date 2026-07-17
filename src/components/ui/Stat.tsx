import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const statValue = cva("font-bold tabular-nums", {
  variants: {
    tone: {
      ink: "text-ink",
      money: "text-money",
      chips: "text-chips",
      mult: "text-mult",
      success: "text-success",
    },
    size: {
      md: "text-lg",
      lg: "text-xl",
    },
  },
  defaultVariants: { tone: "ink", size: "md" },
});

type StatProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof statValue> & {
    readonly label: string;
    readonly value: React.ReactNode;
    readonly valueTestId?: string;
  };

export function Stat({
  className,
  tone,
  size,
  label,
  value,
  valueTestId,
  ...props
}: StatProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg border border-border bg-raised px-2 py-1.5",
        className,
      )}
      {...props}
    >
      <span className={statValue({ tone, size })} data-testid={valueTestId}>
        {value}
      </span>
      <span className="text-xs tracking-wider text-muted uppercase">
        {label}
      </span>
    </div>
  );
}
