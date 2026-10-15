import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type EventRequestBody = {
  type?: unknown;
  summary?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  description?: unknown;
  location?: unknown;
  companyId?: unknown;
};

type EventType = "general" | "task" | "company-event" | "company-deadline";

const EVENT_TYPES = new Set<EventType>([
  "general",
  "task",
  "company-event",
  "company-deadline",
]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function jsonResponse(body: unknown, status: number) {
  return Response.json(body, {
    status,
    headers: CORS_HEADERS,
  });
}

function getToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch?.[1]?.trim()) return bearerMatch[1].trim();

  return new URL(request.url).searchParams.get("token")?.trim() ?? "";
}

function asTrimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: unknown) {
  const text = asTrimmedString(value);
  return text || null;
}

function isRequestBody(value: unknown): value is EventRequestBody {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseIsoDateTime(value: unknown, field: string) {
  const raw = asTrimmedString(value);
  if (!raw) return { error: `${field} is required` };

  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return { error: `${field} must be ISO 8601` };

  const match = raw.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?)?/);
  if (!match) return { error: `${field} must include a date` };

  return {
    value: {
      date: match[1],
      time: match[2] ?? null,
    },
  };
}

function addDays(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().split("T")[0];
}

function getValidation(body: EventRequestBody) {
  const type = asTrimmedString(body.type) as EventType;
  if (!EVENT_TYPES.has(type)) {
    return { error: "type must be one of general, task, company-event, company-deadline" };
  }

  const summary = asTrimmedString(body.summary);
  if (!summary) return { error: "summary is required" };

  const start = parseIsoDateTime(body.startDate, "startDate");
  if ("error" in start) return { error: start.error };

  const end =
    body.endDate === undefined || body.endDate === null || body.endDate === ""
      ? { value: { date: addDays(start.value.date, 1), time: null } }
      : parseIsoDateTime(body.endDate, "endDate");
  if ("error" in end) return { error: end.error };

  const companyId = optionalString(body.companyId);
  if ((type === "company-event" || type === "company-deadline") && !companyId) {
    return { error: "companyId is required for company-event and company-deadline" };
  }

  return {
    value: {
      type,
      summary,
      start: start.value,
      end: end.value,
      description: optionalString(body.description),
      location: optionalString(body.location),
      companyId,
    },
  };
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(request: Request) {
  const token = getToken(request);
  if (!token) return jsonResponse({ error: "token is required" }, 401);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: "request body must be valid JSON" }, 400);
  }
  if (!isRequestBody(body)) {
    return jsonResponse({ error: "request body must be a JSON object" }, 400);
  }

  const validation = getValidation(body);
  if ("error" in validation) return jsonResponse({ error: validation.error }, 400);

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "events API is unavailable" },
      503
    );
  }

  const { data: subscription, error: subscriptionError } = await supabase
    .from("calendar_subscriptions")
    .select("user_id")
    .eq("token", token)
    .maybeSingle();

  if (subscriptionError) return jsonResponse({ error: subscriptionError.message }, 500);
  if (!subscription) return jsonResponse({ error: "invalid token" }, 401);

  const event = validation.value;
  const commonDateFields = {
    event_date: event.start.date,
    event_time: event.start.time,
    event_end_time: event.end.date === event.start.date ? event.end.time : null,
  };

  if (event.companyId) {
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("id", event.companyId)
      .eq("user_id", subscription.user_id)
      .maybeSingle();

    if (companyError) return jsonResponse({ error: companyError.message }, 500);
    if (!company) return jsonResponse({ error: "companyId was not found" }, 400);
  }

  if (event.type === "general") {
    const generalFields = {
      title: event.summary,
      type: "other" as const,
      ...commonDateFields,
      location: event.location,
      memo: event.description,
    };

    // 重複防止は general_events_no_dup と同条件(時刻ありのみ)。
    if (commonDateFields.event_time) {
      const { data: existing, error: findError } = await supabase
        .from("general_events")
        .select("id")
        .eq("user_id", subscription.user_id)
        .eq("event_date", commonDateFields.event_date)
        .eq("event_time", commonDateFields.event_time)
        .eq("title", event.summary)
        .is("deleted_at", null)
        .maybeSingle();
      if (findError) return jsonResponse({ error: findError.message }, 500);
      if (existing) {
        const { data: updated, error: updateError } = await supabase
          .from("general_events")
          .update(generalFields)
          .eq("id", existing.id)
          .select()
          .single();
        if (updateError) return jsonResponse({ error: updateError.message }, 500);
        return jsonResponse({ updated: true, id: updated.id }, 200);
      }
    }

    const { data, error } = await supabase
      .from("general_events")
      .insert({ ...generalFields, user_id: subscription.user_id })
      .select()
      .single();

    if (error?.code === "23505") {
      const { data: dup } = await supabase
        .from("general_events")
        .select("id")
        .eq("user_id", subscription.user_id)
        .eq("event_date", commonDateFields.event_date)
        .eq("event_time", commonDateFields.event_time)
        .eq("title", event.summary)
        .is("deleted_at", null)
        .maybeSingle();
      return jsonResponse({ error: "event already exists", id: dup?.id ?? null }, 409);
    }
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse(data, 201);
  }

  if (event.type === "task") {
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: event.summary,
        deadline: event.start.date,
        memo: event.description,
        company_id: event.companyId,
        user_id: subscription.user_id,
      })
      .select()
      .single();

    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse(data, 201);
  }

  if (event.type === "company-event") {
    const companyEventFields = {
      company_id: event.companyId,
      type: "other" as const,
      title: event.summary,
      schedule_status: "confirmed" as const,
      ...commonDateFields,
      memo: event.description,
    };

    // 重複防止は company_events_no_dup と同条件(時刻ありのみ)。
    // 既存の生存行があれば新規作成せず更新し、{updated:true,id} を返す。
    if (commonDateFields.event_time) {
      const { data: existing, error: findError } = await supabase
        .from("company_events")
        .select("id")
        .eq("user_id", subscription.user_id)
        .eq("company_id", event.companyId)
        .eq("event_date", commonDateFields.event_date)
        .eq("event_time", commonDateFields.event_time)
        .is("deleted_at", null)
        .maybeSingle();
      if (findError) return jsonResponse({ error: findError.message }, 500);
      if (existing) {
        const { data: updated, error: updateError } = await supabase
          .from("company_events")
          .update(companyEventFields)
          .eq("id", existing.id)
          .select()
          .single();
        if (updateError) return jsonResponse({ error: updateError.message }, 500);
        return jsonResponse({ updated: true, id: updated.id }, 200);
      }
    }

    const { data, error } = await supabase
      .from("company_events")
      .insert({ ...companyEventFields, user_id: subscription.user_id })
      .select()
      .single();

    if (error?.code === "23505") {
      const { data: dup } = await supabase
        .from("company_events")
        .select("id")
        .eq("user_id", subscription.user_id)
        .eq("company_id", event.companyId)
        .eq("event_date", commonDateFields.event_date)
        .eq("event_time", commonDateFields.event_time)
        .is("deleted_at", null)
        .maybeSingle();
      return jsonResponse({ error: "event already exists", id: dup?.id ?? null }, 409);
    }
    if (error) return jsonResponse({ error: error.message }, 500);
    return jsonResponse(data, 201);
  }

  const { data, error } = await supabase
    .from("companies")
    .update({ deadline: event.start.date })
    .eq("id", event.companyId)
    .eq("user_id", subscription.user_id)
    .select()
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse(data, 201);
}
