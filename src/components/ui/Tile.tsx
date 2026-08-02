import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./cn";

export const tile = cva(
  "flex h-tile-h w-tile-w min-w-0 shrink flex-col gap-1 overflow-hidden rounded-lg border border-t-2 border-border bg-raised p-2 text-left text-2xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
  {
    variants: {
      accent: {
        none: "border-t-border",
        chips: "border-t-chips",
        mult: "border-t-mult",
        money: "border-t-money",
        success: "border-t-success",
        advisor: "border-t-advisor",
      },
      interactive: {
        true: "cursor-pointer hover:bg-hover",
        false: "opacity-60",
      },
      dimmed: {
        true: "opacity-50 saturate-50",
      },
    },
    defaultVariants: { accent: "none", interactive: true },
  },
);

export type TileVariants = VariantProps<typeof tile>;

export const emptyTile =
  "flex h-tile-h w-tile-w min-w-0 shrink items-center justify-center rounded-lg border-2 border-dashed border-border text-2xs text-muted italic";

export { cn };
