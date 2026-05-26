import {
  COMPANY_EVENT_TYPE_LABELS,
  EVENT_SCHEDULE_STATUS_LABELS,
  type CompanyEvent,
  type CompanyEventCandidateSlot,
  type CompanyEventType,
  type EventScheduleStatus,
} from "@/types";

export type CompanyEventScheduleEntry = {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  isCandidate: boolean;
  scheduleStatus: EventScheduleStatus;
};

export function normalizeCompanyEventStatus(
  status: EventScheduleStatus | null | undefined
): EventScheduleStatus {
  if (status === "tentative" || status === "undecided") return status;
  return "confirmed";
}

export function normalizeCandidateSlots(
  value: CompanyEvent["candidate_slots"] | unknown
): CompanyEventCandidateSlot[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const slot = item as Record<string, unknown>;
    const date =
      typeof slot.date === "string" ? slot.date.trim() : "";
    if (!date) return [];

    return [
      {
        date,
        start_time:
          typeof slot.start_time === "string" && slot.start_time.trim()
            ? slot.start_time.trim()
            : null,
        end_time:
          typeof slot.end_time === "string" && slot.end_time.trim()
            ? slot.end_time.trim()
            : null,
      },
    ];
  });
}

export function buildCompanyEventScheduleEntries(
  event: Pick<
    CompanyEvent,
    | "id"
    | "schedule_status"
    | "event_date"
    | "event_time"
    | "event_end_time"
    | "candidate_slots"
  >
): CompanyEventScheduleEntry[] {
  const entries: CompanyEventScheduleEntry[] = [];
  const scheduleStatus = normalizeCompanyEventStatus(event.schedule_status);

  if (event.event_date) {
    entries.push({
      id: `${event.id}:main`,
      date: event.event_date,
      startTime: event.event_time ?? null,
      endTime: event.event_end_time ?? null,
      isCandidate: false,
      scheduleStatus,
    });
  }

  for (const [index, candidate] of normalizeCandidateSlots(event.candidate_slots).entries()) {
    entries.push({
      id: `${event.id}:candidate:${index}`,
      date: candidate.date,
      startTime: candidate.start_time ?? null,
      endTime: candidate.end_time ?? null,
      isCandidate: true,
      scheduleStatus: "tentative",
    });
  }

  return entries;
}

export function getCompanyEventScheduleLabel(
  type: CompanyEventType,
  entry: Pick<CompanyEventScheduleEntry, "isCandidate" | "scheduleStatus">
) {
  if (entry.isCandidate) return `${COMPANY_EVENT_TYPE_LABELS[type]}候補`;
  if (entry.scheduleStatus === "tentative") {
    return `${COMPANY_EVENT_TYPE_LABELS[type]}（予定）`;
  }
  return COMPANY_EVENT_TYPE_LABELS[type];
}

export function getCompanyEventStatusText(
  entry: Pick<CompanyEventScheduleEntry, "isCandidate" | "scheduleStatus">
) {
  if (entry.isCandidate) return "候補日";
  return EVENT_SCHEDULE_STATUS_LABELS[entry.scheduleStatus];
}

export function parseCandidateSlotsFromJson(value: string | null | undefined) {
  if (!value) return [];

  try {
    return normalizeCandidateSlots(JSON.parse(value));
  } catch {
    return [];
  }
}

function toTimeRangeMinutes(startTime: string | null, endTime: string | null) {
  if (!startTime) return null;
  const start = parseTimeToMinutes(startTime);
  if (start === null) return null;

  const endCandidate = endTime ? parseTimeToMinutes(endTime) : start;
  const end = endCandidate === null ? start : endCandidate;

  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

export function hasScheduleConflict(
  first: {
    date: string;
    startTime: string | null;
    endTime: string | null;
  },
  second: {
    date: string;
    startTime: string | null;
    endTime: string | null;
  }
) {
  if (first.date !== second.date) return false;

  const firstRange = toTimeRangeMinutes(first.startTime, first.endTime);
  const secondRange = toTimeRangeMinutes(second.startTime, second.endTime);

  if (!firstRange || !secondRange) return true;
  return firstRange.start <= secondRange.end && secondRange.start <= firstRange.end;
}

function parseTimeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours * 60 + minutes;
}
