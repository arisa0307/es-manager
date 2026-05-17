/** 選考ステータス: 未エントリー → ES → Webテスト → 面接 → 内定/落選 */
export const COMPANY_STATUSES = [
  "未エントリー",
  "ES",
  "Webテスト",
  "面接",
  "内定",
  "落選",
] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

export const COMPANY_RESULTS = ["", "内定", "落選", "辞退", "進行中"] as const;
export type CompanyResult = (typeof COMPANY_RESULTS)[number];

export const DESIRED_LEVELS = ["S", "A", "B", "C"] as const;
export type DesiredLevel = (typeof DESIRED_LEVELS)[number];

export const DESIRED_LEVEL_LABELS: Record<DesiredLevel, string> = {
  S: "S",
  A: "A",
  B: "B",
  C: "C",
};

export const TASK_PRIORITIES = ["high", "mid", "low"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: "高",
  mid: "中",
  low: "低",
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
  deadline: string | null;
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
  companies: Pick<Company, "id" | "name"> | null;
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
  deadline?: string | null;
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

export type ESTemplateInsert = {
  title: string;
  question: string;
  answer?: string | null;
  word_count?: number | null;
  tags?: string[] | null;
};

export type ESTemplateUpdate = Partial<ESTemplateInsert>;

/** 企業詳細のローカル保存データ（Webテスト・ID/Password） */
export type CompanyLocalData = {
  webTestUrl?: string;
  webTestNotes?: string;
  loginId?: string;
  loginPassword?: string;
};

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
  type: "company" | "task";
  companyId?: string;
  href: string;
};
