/**
 * 選考ステータス = 選考プロセスの「段階」:
 * 未エントリー → マイページ登録済み → インターン申込済み → インターン結果待ち → ES → Webテスト → 面接
 * 内定/落選/辞退などの「結末」は status ではなく COMPANY_RESULTS で持つ(役割を分離)。
 */
export const COMPANY_STATUSES = [
  "未エントリー",
  "マイページ登録済み",
  "インターン申込済み",
  "インターン結果待ち",
  "ES",
  "Webテスト",
  "面接",
  "落選",
] as const;
export type CompanyStatus = (typeof COMPANY_STATUSES)[number];

/** 選考結果 = 最終的な「結末」。進行中かどうかと、内定/落選/辞退を表す。 */
export const COMPANY_RESULTS = ["", "進行中", "内定", "落選", "辞退"] as const;
export type CompanyResult = (typeof COMPANY_RESULTS)[number];

export const DESIRED_LEVELS = ["S", "A", "B", "C", "D", "ワンチャン枠", "多様性", "練習用"] as const;
export type DesiredLevel = (typeof DESIRED_LEVELS)[number];

export const DESIRED_LEVEL_LABELS: Record<DesiredLevel, string> = {
  S: "S",
  A: "A",
  B: "B",
  C: "C",
  D: "D",
  ワンチャン枠: "ワンチャン枠",
  多様性: "多様性",
  練習用: "練習用",
};

export const TASK_PRIORITIES = ["high", "mid", "low"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: "高",
  mid: "中",
  low: "低",
};

/** GTD の種別: 次の行動 / 待ち(相手待ち) / いつか */
export const TASK_KINDS = ["next", "waiting", "someday"] as const;
export type TaskKind = (typeof TASK_KINDS)[number];

export const TASK_KIND_LABELS: Record<TaskKind, string> = {
  next: "次の行動",
  waiting: "待ち",
  someday: "いつか",
};

/** タスクの分類: 就活 / 基本情報技術者試験 / 実習 / その他 */
export const TASK_CATEGORIES = ["shukatsu", "fe", "jisshu", "other"] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  shukatsu: "就活",
  fe: "基本情報",
  jisshu: "実習",
  other: "その他",
};

export const COMPANY_EVENT_TYPES = [
  "info_session",
  "internship",
  "es",
  "web_test",
  "gd",
  "interview",
  "other",
] as const;
export type CompanyEventType = (typeof COMPANY_EVENT_TYPES)[number];

export const COMPANY_EVENT_TYPE_LABELS: Record<CompanyEventType, string> = {
  info_session: "説明会",
  internship: "インターン",
  es: "ES",
  web_test: "Webテスト",
  gd: "グループディスカッション",
  interview: "面接",
  other: "その他",
};

/**
 * 選考ステップの結果。ES・Webテスト・AI面接などの通過可否を記録する。
 * 日付が決まっている予定(company_events)と、日付未定でタスク管理するもの(tasks)の
 * どちらでも同じ値を使う。
 */
export const SELECTION_RESULTS = ["", "結果待ち", "通過", "不通過"] as const;
export type SelectionResult = (typeof SELECTION_RESULTS)[number];

/** 面接のラウンド(明示分類用) */
export const INTERVIEW_ROUND_OPTIONS = [
  "一次面接",
  "二次面接",
  "三次面接",
  "最終面接",
  "AI面接",
] as const;
export type InterviewRound = (typeof INTERVIEW_ROUND_OPTIONS)[number];

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
  /** その企業固有の進捗状況を自由記述で(例: SPIリンク待ち / ES提出済み / インターン結果待ち) */
  progress_note: string | null;
  /** 面接対策メモ(想定質問・逆質問案・自己PRなど) */
  interview_prep: string | null;
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
  /** ログインパスワードが（暗号化して）保存されているか。値そのものは画面に渡さない */
  has_login_password: boolean;
  created_at: string;
  updated_at: string;
};

export type ES = {
  id: string;
  company_id: string;
  /** 所属するES提出(応募)。1提出に複数設問がぶら下がる。 */
  submission_id: string | null;
  question: string;
  answer: string | null;
  word_count: number | null;
  tags: string[] | null;
  base_es: string | null;
  /** 旧: 設問ごとの通過可否。現在は提出単位(es_submissions.result)で管理。 */
  result?: string | null;
  created_at: string;
  updated_at: string;
};

/** ES提出(応募)の種別 */
export const ES_PHASES = ["インターン", "本選考", "その他"] as const;
export type EsPhase = (typeof ES_PHASES)[number];

/** ES提出の種別。アンケート回答も同じ仕組みで管理する(通過率はESのみ集計)。 */
export const ES_SUBMISSION_KINDS = ["ES", "アンケート"] as const;
export type EsSubmissionKind = (typeof ES_SUBMISSION_KINDS)[number];

/**
 * ES提出(応募)= 通過可否・添付・種別を持つ単位。設問(ES)はこの下にぶら下がる。
 * 同じ企業でインターン用・本選考用など複数の提出を持てる。
 */
export type ESSubmission = {
  id: string;
  company_id: string;
  kind: EsSubmissionKind;
  phase: EsPhase;
  title: string | null;
  result: string | null;
  submitted_on: string | null;
  file_path: string | null;
  file_name: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export type ESSubmissionInsert = {
  company_id: string;
  kind?: EsSubmissionKind;
  phase?: EsPhase;
  title?: string | null;
  result?: string | null;
  submitted_on?: string | null;
  file_path?: string | null;
  file_name?: string | null;
  memo?: string | null;
};

export type ESSubmissionUpdate = Partial<Omit<ESSubmissionInsert, "company_id">>;

export type ESSubmissionWithDetails = ESSubmission & {
  companies: Pick<Company, "id" | "name"> | null;
  es: ES[];
};

/** タスクを選考ステップとして集計に含めるための種別(ESは提出で管理するため対象外) */
export const TASK_STAGES = ["適性試験", "GD", "面接"] as const;
export type TaskStage = (typeof TASK_STAGES)[number];

export type Task = {
  id: string;
  company_id: string | null;
  title: string;
  deadline: string | null;
  priority: TaskPriority;
  is_done: boolean;
  memo: string | null;
  /** 日付未定でタスク管理する選考ステップの通過可否 */
  result?: string | null;
  /** 適性試験/GD/面接 のどれか。設定すると通過率の集計に含まれる。 */
  stage?: string | null;
  /** GTD 種別(次の行動/待ち/いつか) */
  kind?: TaskKind | null;
  /** 分類(就活/基本情報/実習/その他) */
  category?: TaskCategory | null;
  /** 見積もりポモ数。0 は10分以内の小タスク。 */
  est_pomos?: number | null;
  /** 大きいタスクを分割したときの親タスク */
  parent_task_id?: string | null;
  /** 今日の並びに入れた日付(Asia/Tokyo, YYYY-MM-DD) */
  plan_date?: string | null;
  /** その日の並び順(小さいほど先) */
  plan_order?: number | null;
  /** 待ちの相手(例: claude / company / 企業名) */
  waiting_on?: string | null;
  /**
   * カレンダー(Googleカレンダー同期／アプリ内)に締切を出すか。
   * true=常に出す / false=出さない / null=est_pomos>=1 のときだけ出す(既定)
   */
  show_on_calendar?: boolean | null;
  /** 今日の最優先(Must)。/focus で赤枠+MUSTバッジ表示。毎朝ブリーフィングで設定。 */
  is_must?: boolean | null;
  /** ゴミ箱(ソフト削除)日時。null なら生存。 */
  deleted_at?: string | null;
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
  /** 事前メモ: URL・服装・持ち物など、参加前に見たい情報 */
  memo: string | null;
  /** 参加後の記録: 説明会で聞いた内容など、後から振り返る情報 */
  report?: string | null;
  /** ES・Webテスト・面接などの通過可否 */
  result?: string | null;
  /** 面接のラウンド(一次/二次/最終/AIなど)。type=interview のとき使用。 */
  interview_round?: string | null;
  /** ゴミ箱(ソフト削除)日時。null なら生存。 */
  deleted_at?: string | null;
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
  progress_note?: string | null;
  interview_prep?: string | null;
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
  /** 入力されたログインパスワード（平文）。サーバーで暗号化してから保存し、平文の列には書かない */
  login_password?: string;
  /** true なら保存済みのログインパスワードを消す */
  clear_login_password?: boolean;
};

export type CompanyUpdate = Partial<CompanyInsert>;

export type ESInsert = {
  company_id: string;
  submission_id: string;
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
  result?: string | null;
  stage?: string | null;
  kind?: TaskKind | null;
  category?: TaskCategory | null;
  est_pomos?: number | null;
  parent_task_id?: string | null;
  plan_date?: string | null;
  plan_order?: number | null;
  waiting_on?: string | null;
  show_on_calendar?: boolean | null;
  is_must?: boolean | null;
};

export type TaskUpdate = Partial<TaskInsert>;

/**
 * /focus でタスクに入っていなくても常に選べるポモの対象。
 * 選んだときは pomodoro_sessions.task_id=null、note にこのラベルを記録する。
 */
export const FOCUS_FIXED_SUBJECTS = ["基本情報技術者", "国試", "Webテスト対策"] as const;
export type FocusFixedSubject = (typeof FOCUS_FIXED_SUBJECTS)[number];

/** ポモドーロの1セッション(集中/休憩)。/focus ページで記録する。 */
export const POMODORO_KINDS = ["focus", "short_break", "long_break"] as const;
export type PomodoroKind = (typeof POMODORO_KINDS)[number];

export type PomodoroSession = {
  id: string;
  user_id: string;
  task_id: string | null;
  started_at: string;
  ended_at: string | null;
  kind: PomodoroKind;
  completed: boolean;
  note: string | null;
  created_at: string;
};

/**
 * /focus の時間計測1件(pomodoro_sessions の kind='focus' の行)。
 * ended_at が null なら計測中。
 */
export type FocusSessionEntry = {
  id: string;
  task_id: string | null;
  note: string | null;
  started_at: string;
  ended_at: string | null;
  /** タスク名、または固定の対象(基本情報技術者など) */
  label: string;
  company: string | null;
  /** lib/focus-categories.ts の FocusCategoryId */
  category: string;
  /** /focus の日付(7:00 JST区切り, 開始時刻基準) */
  day: string;
};

/** /focus で計測する対象。タスク、または固定の対象。 */
export type FocusTargetInput =
  | { taskId: string; subject?: undefined }
  | { taskId?: undefined; subject: FocusFixedSubject };

export type HealthLog = {
  id: string;
  user_id: string;
  log_date: string;
  weight_kg: number | null;
  intake_kcal: number | null;
  active_kcal: number | null;
  steps: number | null;
  created_at: string;
  updated_at: string;
};

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
  report?: string | null;
  result?: string | null;
  interview_round?: string | null;
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
  /** ゴミ箱(ソフト削除)日時。null なら生存。 */
  deleted_at?: string | null;
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
  /** 予定一覧から削除するための元レコード参照(企業詳細のみ設定) */
  deleteId?: string;
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
> & {
  /** どの企業の予定か表示するための join 結果 */
  companies: { name: string } | null;
};
