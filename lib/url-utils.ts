/** href 用に http(s) を補う（保存値は変更しない） */
export function normalizeUrlForHref(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^www\./i.test(trimmed)) return `https://${trimmed}`;
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/[^\s]*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}

const INLINE_URL_PATTERN =
  /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

export function splitTextWithUrls(text: string): { type: "text" | "url"; value: string }[] {
  const parts: { type: "text" | "url"; value: string }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const pattern = new RegExp(INLINE_URL_PATTERN.source, "gi");
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "url", value: match[0] });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", value: text.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text", value: text }];
}
