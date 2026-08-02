import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

const panel = cva("rounded-xl border border-border", {
  variants: {
    tone: {
      surface: "bg-surface",
      raised: "bg-raised",
      sunken: "bg-bg",
    },
    pad: {
      none: "",
      sm: "p-2",
      md: "p-4",
    },
  },
  defaultVariants: { tone: "surface", pad: "md" },
});

type PanelProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof panel>;

export function Panel({ className, tone, pad, ...props }: PanelProps) {
  return <div className={cn(panel({ tone, pad }), className)} {...props} />;
}

type TrayProps = React.HTMLAttributes<HTMLElement> &
  VariantProps<typeof panel> & { readonly heading: string };

export function Tray({
  className,
  tone,
  pad,
  heading,
  children,
  ...props
}: TrayProps) {
  return (
    <section className={cn(panel({ tone, pad }), className)} {...props}>
      <h2 className="mb-2 text-xs font-bold tracking-widest text-muted uppercase">
        {heading}
      </h2>
      {children}
    </section>
  );
}
