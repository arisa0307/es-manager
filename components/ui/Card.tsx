import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  hover,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  hover?: boolean;
}) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-sm",
        hover && "transition-shadow hover:shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}
