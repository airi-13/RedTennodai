// 定期スケジュール(student_schedules)の有効期間に関する共通処理。
// 定期スケジュールの変更は「変更した翌日以降」のみ反映し、当日以前の日付は変更しない。
// そのため各行に effective_from(開始日) / effective_until(終了日、NULL=現在も有効) を持たせている。

// サーバー(UTC)で動いていても、日本時間の日付(YYYY-MM-DD)を返す。
export function jstTodayString(now: Date = new Date()): string {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10);
}

export function addDaysToDateString(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function jstTomorrowString(now: Date = new Date()): string {
  return addDaysToDateString(jstTodayString(now), 1);
}

type Effective = { effective_from: string; effective_until: string | null };

// その日付(YYYY-MM-DD)に、この定期スケジュール行が有効かどうか。
export function isScheduleActiveOn(row: Effective, date: string): boolean {
  return row.effective_from <= date && (row.effective_until == null || row.effective_until >= date);
}

// Supabaseのクエリに「指定日に有効」の条件を足すための、PostgRESTのor条件文字列。
export function activeOnOrFilter(date: string): string {
  return `effective_until.is.null,effective_until.gte.${date}`;
}
