import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  hover,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
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
