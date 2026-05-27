type IcsEvent = {
  uid: string;
  title: string;
  description?: string | null;
  location?: string | null;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  url?: string | null;
  dtStamp?: Date;
};

function formatDateToIcs(value: string) {
  return value.replaceAll("-", "");
}

function formatDateTimeToIcs(date: string, time: string) {
  return `${formatDateToIcs(date)}T${time.replace(":", "")}00`;
}

function foldLine(line: string) {
  const max = 75;
  if (line.length <= max) return line;

  const chunks: string[] = [];
  for (let i = 0; i < line.length; i += max) {
    chunks.push(i === 0 ? line.slice(i, i + max) : ` ${line.slice(i, i + max)}`);
  }
  return chunks.join("\r\n");
}

function escapeText(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\n", "\\n");
}

function toUtcStamp(date: Date) {
  return date.toISOString().replaceAll("-", "").replaceAll(":", "").split(".")[0] + "Z";
}

function buildEventLines(event: IcsEvent) {
  const lines: string[] = [];
  const stamp = toUtcStamp(event.dtStamp ?? new Date());

  lines.push("BEGIN:VEVENT");
  lines.push(`UID:${escapeText(event.uid)}`);
  lines.push(`DTSTAMP:${stamp}`);

  if (event.startTime) {
    const dtStart = formatDateTimeToIcs(event.date, event.startTime);
    const dtEnd = event.endTime
      ? formatDateTimeToIcs(event.date, event.endTime)
      : formatDateTimeToIcs(event.date, event.startTime);

    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${formatDateToIcs(event.date)}`);
  }

  lines.push(`SUMMARY:${escapeText(event.title)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.url) lines.push(`URL:${escapeText(event.url)}`);

  lines.push("END:VEVENT");
  return lines.map(foldLine);
}

export function buildIcsCalendar(events: IcsEvent[], calendarName: string) {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//a.t//job-hunt-calendar//JA",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];

  for (const event of events) {
    lines.push(...buildEventLines(event));
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
