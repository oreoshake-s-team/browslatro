import { cn } from "./cn";

type EmptySlotProps = React.HTMLAttributes<HTMLDivElement> & {
  readonly label: string;
};

export function EmptySlot({ className, label, ...props }: EmptySlotProps) {
  return (
    <div
      className={cn(
        "flex h-28 w-20 shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-border text-xs text-muted italic",
        className,
      )}
      {...props}
    >
      {label}
    </div>
  );
}
