import { CopyableInput } from "@/components/ui/CopyableInput";
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
  type Company,
  type CompanyStatus,
  type DesiredLevel,
} from "@/types";

export function parseCompanyFormData(form: FormData) {
  return {
    name: form.get("name") as string,
    industry: (form.get("industry") as string) || null,
    url: (form.get("url") as string) || null,
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
  const event_date = form.get("event_date") as string;
  if (!title || !event_date) return null;
  return {
    type: form.get("event_type") as "internship" | "interview" | "other",
    title,
    event_date,
    event_time: (form.get("event_time") as string)?.trim() || null,
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
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="URL">
          <Input
            name="url"
            type="url"
            defaultValue={company?.url ?? ""}
            placeholder="https://"
          />
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
        <SectionTitle title="重要項目" description="締切・次のアクション・メモ" />
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
        <SectionTitle title="インターン情報" />
        <Field label="インターン名">
          <Input
            name="internship_name"
            defaultValue={company?.internship_name ?? ""}
            placeholder="例: Summer Internship"
          />
        </Field>
        <Field label="場所・URL">
          <Input
            name="internship_location"
            defaultValue={company?.internship_location ?? ""}
            placeholder="オンライン / 東京本社 / https://..."
          />
        </Field>
        <Field label="インターンメモ">
          <Textarea
            name="internship_memo"
            rows={3}
            defaultValue={company?.internship_memo ?? ""}
            placeholder="内容、準備すること、気になる点など"
          />
        </Field>
      </section>

      <section className="space-y-3 rounded-lg border border-border p-3">
        <SectionTitle
          title="Webテスト情報"
          description="企業データとして Supabase に保存されます"
        />
        <Field label="Webテスト URL">
          <Input
            name="web_test_url"
            type="url"
            defaultValue={company?.web_test_url ?? ""}
            placeholder="https://"
          />
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
            description="登録後は詳細ページでも追加できます"
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
            <Field label="日程">
              <Input type="date" name="event_date" />
            </Field>
          </div>
          <Field label="開催時間">
            <Input type="time" name="event_time" />
          </Field>
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
