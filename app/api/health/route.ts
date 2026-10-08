import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type HealthRequestBody = {
  logDate?: unknown;
  weightKg?: unknown;
  intakeKcal?: unknown;
  activeKcal?: unknown;
  steps?: unknown;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function jsonResponse(body: unknown, status: number) {
  return Response.json(body, { status, headers: CORS_HEADERS });
}

function getToken(request: Request) {
  const authorization = request.headers.get("authorization")?.trim() ?? "";
  const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
  if (bearerMatch?.[1]?.trim()) return bearerMatch[1].trim();
  return new URL(request.url).searchParams.get("token")?.trim() ?? "";
}

function isRequestBody(value: unknown): value is HealthRequestBody {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 数値に変換できれば number、欠けていれば null。不正値はエラー扱い。 */
function optionalNumber(value: unknown, field: string) {
  if (value === undefined || value === null || value === "") {
    return { value: null };
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return { error: `${field} must be a number` };
  return { value: n };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
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

  const logDate = typeof body.logDate === "string" ? body.logDate.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(logDate)) {
    return jsonResponse({ error: "logDate must be YYYY-MM-DD" }, 400);
  }

  const weight = optionalNumber(body.weightKg, "weightKg");
  if ("error" in weight) return jsonResponse({ error: weight.error }, 400);
  const intake = optionalNumber(body.intakeKcal, "intakeKcal");
  if ("error" in intake) return jsonResponse({ error: intake.error }, 400);
  const active = optionalNumber(body.activeKcal, "activeKcal");
  if ("error" in active) return jsonResponse({ error: active.error }, 400);
  const steps = optionalNumber(body.steps, "steps");
  if ("error" in steps) return jsonResponse({ error: steps.error }, 400);

  let supabase;
  try {
    supabase = createAdminClient();
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "health API is unavailable" },
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

  // ショートカットが実際に何を送ってきたか(特に intake_kcal を送れているか)を
  // 後から確認できるよう、受信した生のリクエスト本文を記録する。失敗しても本処理は続行。
  try {
    await supabase.from("health_log_requests").insert({
      user_id: subscription.user_id,
      log_date: logDate,
      body: body as Record<string, unknown>,
    });
  } catch {
    // ログ失敗は無視(本来の保存処理を妨げない)
  }

  // 同じ日付があれば条件付きで upsert する(DB関数で1文・アトミックに判定)。
  // - 体重/活動kcal/歩数: 送信値が null か 0 なら既存値を保持(未計測の0で消さない)
  // - 摂取kcal: 後から来た値のほうが大きいときだけ更新
  // - updated_at に更新時刻を記録
  const { data, error } = await supabase
    .rpc("upsert_health_log", {
      p_user_id: subscription.user_id,
      p_log_date: logDate,
      p_weight: weight.value,
      p_intake: intake.value,
      p_active: active.value,
      p_steps: steps.value,
    })
    .single();

  if (error) return jsonResponse({ error: error.message }, 500);
  return jsonResponse(data, 201);
}
