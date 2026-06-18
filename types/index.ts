/** 選考ステータス: 未エントリー → マイページ登録済み → ES → Webテスト → 面接 → 内定/落選 */
export const COMPANY_STATUSES = [
  "未エントリー",
  "マイページ登録済み",
  "ES",
  "Webテスト",
  "面接",
  "内定",
  "落選",
] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export const COMPANY_RESULTS = ["", "内定", "落選", "辞退", "進行中"] as const;
export type CompanyResult = (typeof COMPANY_RESULTS)[number];

export const DESIRED_LEVELS = ["S", "A", "B", "C", "ワンチャン枠", "多様性"] as const;
export type DesiredLevel = (typeof DESIRED_LEVELS)[number];

export const DESIRED_LEVEL_LABELS: Record<DesiredLevel, string> = {
  S: "S",
  A: "A",
  B: "B",
  C: "C",
  ワンチャン枠: "ワンチャン枠",
  多様性: "多様性",
};

export const TASK_PRIORITIES = ["high", "mid", "low"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: "高",
  mid: "中",
  low: "低",
};

export const COMPANY_EVENT_TYPES = ["internship", "interview", "other"] as const;
export type CompanyEventType = (typeof COMPANY_EVENT_TYPES)[number];

export const COMPANY_EVENT_TYPE_LABELS: Record<CompanyEventType, string> = {
  internship: "インターン",
  interview: "面接",
  other: "説明会・その他",
};

export const EVENT_SCHEDULE_STATUSES = [
  "confirmed",
  "tentative",
  "undecided",
] as const;
export type EventScheduleStatus = (typeof EVENT_SCHEDULE_STATUSES)[number];

export const EVENT_SCHEDULE_STATUS_LABELS: Record<EventScheduleStatus, string> = {
  confirmed: "確定",
  tentative: "予定",
  undecided: "未定",
};

export const GENERAL_EVENT_TYPES = ["career_fair", "seminar", "other"] as const;
export type GeneralEventType = (typeof GENERAL_EVENT_TYPES)[number];

export const GENERAL_EVENT_TYPE_LABELS: Record<GeneralEventType, string> = {
  career_fair: "合同説明会",
  seminar: "セミナー",
  other: "その他",
};

export type Company = {
  id: string;
  name: string;
  industry: string | null;
  url: string | null;
  desired_level: DesiredLevel | null;
  status: CompanyStatus;
  result: string | null;
  salary: string | null;
  next_action: string | null;
  memo: string | null;
  internship_name: string | null;
  internship_location: string | null;
  internship_memo: string | null;
  deadline: string | null;
  web_test_url: string | null;
  web_test_notes: string | null;
  login_id: string | null;
  login_password: string | null;
  created_at: string;
  updated_at: string;
};

export type ES = {
  id: string;
  company_id: string;
  question: string;
  answer: string | null;
  word_count: number | null;
  tags: string[] | null;
  base_es: string | null;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  company_id: string | null;
  title: string;
  deadline: string | null;
  priority: TaskPriority;
  is_done: boolean;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyEvent = {
  id: string;
  company_id: string;
  type: CompanyEventType;
  title: string;
  schedule_status?: EventScheduleStatus;
  event_date: string | null;
  event_time?: string | null;
  event_end_time?: string | null;
  candidate_slots?: CompanyEventCandidateSlot[] | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyEventCandidateSlot = {
  date: string;
  start_time?: string | null;
  end_time?: string | null;
};

export type ESTemplate = {
  id: string;
  title: string;
  question: string;
  answer: string | null;
  word_count: number | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
};

export type ESWithCompany = ES & {
  companies: Pick<Company, "id" | "name"> | null;
};

export type TaskWithCompany = Task & {
  companies: Pick<Company, "id" | "name" | "desired_level"> | null;
};

export type CompanyInsert = {
  name: string;
  industry?: string | null;
  url?: string | null;
  desired_level?: DesiredLevel | null;
  status?: CompanyStatus;
  result?: string | null;
  salary?: string | null;
  next_action?: string | null;
  memo?: string | null;
  internship_name?: string | null;
  internship_location?: string | null;
  internship_memo?: string | null;
  deadline?: string | null;
  web_test_url?: string | null;
  web_test_notes?: string | null;
  login_id?: string | null;
  login_password?: string | null;
};

export type CompanyUpdate = Partial<CompanyInsert>;

export type ESInsert = {
  company_id: string;
  question: string;
  answer?: string | null;
  word_count?: number | null;
  tags?: string[] | null;
  base_es?: string | null;
};

export type ESUpdate = Partial<Omit<ESInsert, "company_id">>;

export type TaskInsert = {
  company_id?: string | null;
  title: string;
  deadline?: string | null;
  priority?: TaskPriority;
  is_done?: boolean;
  memo?: string | null;
};

export type TaskUpdate = Partial<TaskInsert>;

export type CompanyEventInsert = {
  company_id: string;
  type: CompanyEventType;
  title: string;
  schedule_status?: EventScheduleStatus;
  event_date?: string | null;
  event_time?: string | null;
  event_end_time?: string | null;
  candidate_slots?: CompanyEventCandidateSlot[] | null;
  memo?: string | null;
};

export type CompanyEventUpdate = Partial<Omit<CompanyEventInsert, "company_id">>;

export type GeneralEvent = {
  id: string;
  title: string;
  type: GeneralEventType;
  event_date: string | null;
  event_time?: string | null;
  event_end_time?: string | null;
  location: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export type GeneralEventInsert = {
  title: string;
  type?: GeneralEventType;
  event_date: string | null;
  event_time?: string | null;
  event_end_time?: string | null;
  location?: string | null;
  memo?: string | null;
};

export type GeneralEventUpdate = Partial<GeneralEventInsert>;

export type ScheduleItem = {
  id: string;
  date: string;
  title: string;
  kind: "general" | "company_event" | "company_deadline" | "task";
  label: string;
  href: string;
  time?: string | null;
  memo?: string | null;
};

export type ESTemplateInsert = {
  title: string;
  question: string;
  answer?: string | null;
  word_count?: number | null;
  tags?: string[] | null;
};

export type ESTemplateUpdate = Partial<ESTemplateInsert>;

export type CompanySortField =
  | "name"
  | "deadline"
  | "desired_level"
  | "status"
  | "updated_at";

export type SortOrder = "asc" | "desc";

export type CalendarEvent = {
  id: string;
  date: string;
  title: string;
  type: "company" | "task" | CompanyEventType | GeneralEventType;
  companyId?: string;
  href: string;
};

export type CalendarGeneralEventRow = Pick<
  GeneralEvent,
  "id" | "title" | "type" | "event_time" | "event_end_time"
> & { event_date: string };

export type CalendarCompanyEventRow = Pick<
  CompanyEvent,
  | "id"
  | "company_id"
  | "type"
  | "title"
  | "schedule_status"
  | "event_date"
  | "event_time"
  | "event_end_time"
  | "candidate_slots"
>;
