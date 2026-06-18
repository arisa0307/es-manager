import { CopyableInput } from "@/components/ui/CopyableInput";
import { ExternalUrlLink, LinkifiedText } from "@/components/ui/LinkifiedText";
import { OptionalDateField } from "@/components/ui/OptionalDateField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  COMPANY_EVENT_TYPES,
  COMPANY_EVENT_TYPE_LABELS,
  COMPANY_RESULTS,
  COMPANY_STATUSES,
  DESIRED_LEVELS,
  DESIRED_LEVEL_LABELS,
  EVENT_SCHEDULE_STATUSES,
  EVENT_SCHEDULE_STATUS_LABELS,
  type Company,
  type CompanyStatus,
  type DesiredLevel,
  type EventScheduleStatus,
} from "@/types";

export function parseCompanyFormData(form: FormData) {
  const rawCompanyUrl = (form.get("url") as string) ?? "";
  const companyUrl = rawCompanyUrl.trim() || null;

  return {
    name: form.get("name") as string,
    industry: (form.get("industry") as string) || null,
    url: companyUrl,
    desired_level: (form.get("desired_level") as DesiredLevel) || null,
    status: form.get("status") as CompanyStatus,
    result: (form.get("result") as string) || null,
    salary: (form.get("salary") as string) || null,
    next_action: (form.get("next_action") as string) || null,
    memo: (form.get("memo") as string) || null,
    internship_name: (form.get("internship_name") as string) || null,
    internship_location: (form.get("internship_location") as string) || null,
    internship_memo: (form.get("internship_memo") as string) || null,
    deadline: (form.get("deadline") as string) || null,
    web_test_url: (form.get("web_test_url") as string) || null,
    web_test_notes: (form.get("web_test_notes") as string) || null,
    login_id: (form.get("login_id") as string) || null,
    login_password: (form.get("login_password") as string) || null,
  };
}

export function parseOptionalEventFormData(form: FormData) {
  const title = (form.get("event_title") as string)?.trim();
  const schedule_status =
    ((form.get("event_schedule_status") as EventScheduleStatus) || "confirmed");
  const event_date = (form.get("event_date") as string)?.trim() || null;
  if (!title || (!event_date && schedule_status !== "undecided")) return null;
  return {
    type: form.get("event_type") as "internship" | "interview" | "other",
    title,
    schedule_status,
    event_date,
    event_time: (form.get("event_time") as string)?.trim() || null,
    event_end_time: (form.get("event_end_time") as string)?.trim() || null,
    candidate_slots: [],
    memo: (form.get("event_memo") as string) || null,
  };
}

export function CompanyFormFields({
  company,
  showOptionalEvent = false,
}: {
  company?: Company;
  showOptionalEvent?: boolean;
}) {
  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <SectionTitle title="基本情報" />
        <Field label="企業名 *">
          <Input name="name" required defaultValue={company?.name} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="業界">
            <Input name="industry" defaultValue={company?.industry ?? ""} />
          </Field>
          <Field label="志望度">
            <Select name="desired_level" defaultValue={company?.desired_level ?? ""}>
              <option value="">—</option>
              {DESIRED_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {DESIRED_LEVEL_LABELS[l]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="URL">
          <div className="space-y-1.5">
            <Input
              name="url"
              type="text"
              inputMode="url"
              defaultValue={company?.url ?? ""}
              placeholder="https://"
            />
            {company?.url && <ExternalUrlLink url={company.url} />}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ステータス">
            <Select name="status" defaultValue={company?.status ?? "未エントリー"}>
              {COMPANY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="選考結果">
            <Select name="result" defaultValue={company?.result ?? ""}>
              {COMPANY_RESULTS.map((r) => (
                <option key={r} value={r}>
                  {r || "—"}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="年収・待遇">
          <Input name="salary" defaultValue={company?.salary ?? ""} />
        </Field>
      </section>

      <section className="space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
        <SectionTitle
          title="進行・インターン補足"
          description="日付のある予定は下の「インターン・面接日程」へ。ここには補足情報を残せます"
        />
        <Field label="締切・期日">
          <OptionalDateField name="deadline" defaultValue={company?.deadline} />
        </Field>
        <Field label="次のアクション">
          <Textarea
            name="next_action"
            rows={2}
            defaultValue={company?.next_action ?? ""}
            placeholder="次にやること"
          />
        </Field>
        <Field label="インターン名">
          <Input
            name="internship_name"
            defaultValue={company?.internship_name ?? ""}
            placeholder="例: Summer Internship"
          />
        </Field>
        <Field label="場所・URL">
          <div className="space-y-1.5">
            <Input
              name="internship_location"
              type="text"
              defaultValue={company?.internship_location ?? ""}
              placeholder="オンライン / 東京本社 / https://..."
            />
            {company?.internship_location && (
              <p className="text-xs text-muted-foreground">
                <LinkifiedText text={company.internship_location} />
              </p>
            )}
          </div>
        </Field>
        <Field label="インターンメモ">
          <Textarea
            name="internship_memo"
            rows={3}
            defaultValue={company?.internship_memo ?? ""}
            placeholder="内容、準備すること、気になる点など"
          />
        </Field>
        <Field label="企業メモ">
          <Textarea
            name="memo"
            rows={4}
            defaultValue={company?.memo ?? ""}
            placeholder="事業内容、気になった点、面談で聞きたいことなど"
          />
        </Field>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-3">
        <SectionTitle
          title="Webテスト情報"
          description="企業データとして Supabase に保存されます"
        />
        <Field label="Webテスト URL">
          <div className="space-y-1.5">
            <Input
              name="web_test_url"
              type="text"
              inputMode="url"
              defaultValue={company?.web_test_url ?? ""}
              placeholder="https://"
            />
            {company?.web_test_url && <ExternalUrlLink url={company.web_test_url} />}
          </div>
        </Field>
        <Field label="Webテストメモ">
          <Textarea
            name="web_test_notes"
            rows={3}
            defaultValue={company?.web_test_notes ?? ""}
            placeholder="受験期限、形式、注意点など"
          />
        </Field>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-3">
        <SectionTitle
          title="ログイン情報"
          description="マイページ・応募サイトの ID / パスワード"
        />
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="ID">
            <CopyableInput
              name="login_id"
              autoComplete="username"
              defaultValue={company?.login_id ?? ""}
            />
          </Field>
          <Field label="Password">
            <CopyableInput
              name="login_password"
              autoComplete="off"
              defaultValue={company?.login_password ?? ""}
              placeholder="表示・コピー可能"
            />
          </Field>
        </div>
      </section>

      {showOptionalEvent && (
        <section className="space-y-3 rounded-lg border border-border p-3">
          <SectionTitle
            title="初回の日程（任意）"
            description="未定・開始/終了時刻はここで入力できます。候補日は登録後に詳細ページで複数追加できます"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field label="種類">
              <Select name="event_type" defaultValue="interview">
                {COMPANY_EVENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {COMPANY_EVENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="状態">
              <Select name="event_schedule_status" defaultValue="confirmed">
                {EVENT_SCHEDULE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {EVENT_SCHEDULE_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="日程（未定なら空欄）">
              <Input type="date" name="event_date" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="開始">
                <Input type="time" name="event_time" />
              </Field>
              <Field label="終了">
                <Input type="time" name="event_end_time" />
              </Field>
            </div>
          </div>
          <Field label="タイトル">
            <Input name="event_title" placeholder="例: 1次面接 / 1dayインターン" />
          </Field>
          <Field label="メモ">
            <Textarea
              name="event_memo"
              rows={2}
              placeholder="場所、URL、準備することなど"
            />
          </Field>
        </section>
      )}
    </div>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
