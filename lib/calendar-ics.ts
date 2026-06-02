const CALENDAR_TIMEZONE = "Asia/Tokyo";

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

function addDaysToIcsDate(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10).replaceAll("-", "");
}

function parseTimeToMinutes(time: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function minutesToTime(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDateTimeToIcs(date: string, time: string) {
  const minutes = parseTimeToMinutes(time);
  if (minutes === null) return null;
  const normalized = minutesToTime(minutes);
  return `${formatDateToIcs(date)}T${normalized.replace(":", "")}00`;
}

function resolveTimedRange(
  date: string,
  startTime: string,
  endTime?: string | null
): { start: string; end: string } | null {
  const startIcs = formatDateTimeToIcs(date, startTime);
  if (!startIcs) return null;

  const startMinutes = parseTimeToMinutes(startTime);
  if (startMinutes === null) return null;

  let endMinutes = endTime ? parseTimeToMinutes(endTime) : null;
  if (endMinutes === null || endMinutes <= startMinutes) {
    endMinutes = Math.min(startMinutes + 60, 23 * 60 + 59);
  }

  const endIcs = formatDateTimeToIcs(date, minutesToTime(endMinutes));
  if (!endIcs) return null;

  return { start: startIcs, end: endIcs };
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

function buildTimezoneBlock() {
  return [
    "BEGIN:VTIMEZONE",
    `TZID:${CALENDAR_TIMEZONE}`,
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0900",
    "TZOFFSETTO:+0900",
    "DTSTART:19700101T000000",
    "TZNAME:JST",
    "END:STANDARD",
    "END:VTIMEZONE",
  ];
}

function buildEventLines(event: IcsEvent) {
  const lines: string[] = [];
  const stamp = toUtcStamp(event.dtStamp ?? new Date());

  lines.push("BEGIN:VEVENT");
  lines.push(`UID:${escapeText(event.uid)}`);
  lines.push(`DTSTAMP:${stamp}`);

  const timedRange =
    event.startTime && resolveTimedRange(event.date, event.startTime, event.endTime);

  if (timedRange) {
    lines.push(`DTSTART;TZID=${CALENDAR_TIMEZONE}:${timedRange.start}`);
    lines.push(`DTEND;TZID=${CALENDAR_TIMEZONE}:${timedRange.end}`);
  } else {
    const startDate = formatDateToIcs(event.date);
    lines.push(`DTSTART;VALUE=DATE:${startDate}`);
    lines.push(`DTEND;VALUE=DATE:${addDaysToIcsDate(event.date, 1)}`);
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
    ...buildTimezoneBlock(),
  ];

  for (const event of events) {
    lines.push(...buildEventLines(event));
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
