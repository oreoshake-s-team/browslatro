import { cn } from "./cn";
import { emptyTile } from "./Tile";

type EmptySlotProps = React.HTMLAttributes<HTMLDivElement> & {
  readonly label: string;
};

export function EmptySlot({ className, label, ...props }: EmptySlotProps) {
  return (
    <div
      className={cn(emptyTile, className)}
      {...props}
    >
      {label}
    </div>
  );
}
