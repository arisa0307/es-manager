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
        "inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
        variant === "primary" &&
          "bg-foreground text-background hover:opacity-90",
        variant === "secondary" &&
          "bg-card border border-border text-foreground hover:bg-muted",
        variant === "ghost" && "text-muted-foreground hover:bg-muted",
        variant === "danger" &&
          "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 hover:bg-red-500/20",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
