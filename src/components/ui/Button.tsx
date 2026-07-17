import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const button = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-success font-bold text-bg hover:bg-success/85",
        secondary:
          "border-border bg-raised text-muted hover:bg-hover hover:text-ink",
        danger: "bg-mult text-white hover:bg-mult/85",
        ghost: "border-border text-muted hover:bg-white/5 hover:text-ink",
        toggle:
          "border-border bg-raised text-muted hover:bg-hover hover:text-ink aria-pressed:border-transparent aria-pressed:bg-chips aria-pressed:text-white",
        advisor:
          "border-advisor bg-advisor/20 text-ink hover:bg-advisor/35 aria-pressed:bg-advisor/50 aria-pressed:text-white",
      },
      size: {
        sm: "px-3 py-1 text-xs",
        md: "px-4 py-2 text-sm",
        lg: "px-6 py-3 text-base",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof button>;

export function Button({
  className,
  variant,
  size,
  type,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={cn(button({ variant, size }), className)}
      {...props}
    />
  );
}
