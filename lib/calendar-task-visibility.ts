/**
 * タスクの締切をカレンダー（Googleカレンダー同期／アプリ内カレンダー）に
 * 出すかどうかの判定。
 *
 * - show_on_calendar === true  … est_pomos に関係なく出す
 * - show_on_calendar === false … 出さない
 * - show_on_calendar == null   … est_pomos >= 1 のときだけ出す
 *   （est_pomos = 0 や未設定は出さない）
 *
 * /focus の「すぐやる」表示（plan_date / plan_order）には影響しない。
 */
export function shouldShowTaskOnCalendar(task: {
  show_on_calendar?: boolean | null;
  est_pomos?: number | null;
}): boolean {
  if (task.show_on_calendar === true) return true;
  if (task.show_on_calendar === false) return false;
  return (task.est_pomos ?? 0) >= 1;
}
