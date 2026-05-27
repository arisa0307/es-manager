import { normalizeUrlForHref, splitTextWithUrls } from "@/lib/url-utils";
import { cn } from "@/lib/utils";

export function LinkifiedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = splitTextWithUrls(text);

  return (
    <span className={cn("whitespace-pre-wrap break-words", className)}>
      {parts.map((part, index) => {
        if (part.type === "text") {
          return <span key={index}>{part.value}</span>;
        }

        const href = normalizeUrlForHref(part.value);
        if (!href) {
          return <span key={index}>{part.value}</span>;
        }

        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-accent underline underline-offset-2 hover:opacity-80"
          >
            {part.value}
          </a>
        );
      })}
    </span>
  );
}

export function ExternalUrlLink({
  url,
  className,
}: {
  url: string;
  className?: string;
}) {
  const href = normalizeUrlForHref(url);
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-block text-xs text-muted-foreground hover:underline break-all",
        className
      )}
    >
      {url.trim()}
    </a>
  );
}
