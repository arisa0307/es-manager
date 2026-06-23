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
        "rounded-xl border border-border bg-card p-4 shadow-sm",
        hover &&
          "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}
