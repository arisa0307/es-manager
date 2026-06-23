import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
        variant === "primary" &&
          "bg-foreground text-background shadow-sm hover:opacity-90",
        variant === "secondary" &&
          "border border-border bg-card text-foreground shadow-xs hover:bg-muted",
        variant === "ghost" && "text-muted-foreground hover:bg-muted hover:text-foreground",
        variant === "danger" &&
          "border border-red-500/20 bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
