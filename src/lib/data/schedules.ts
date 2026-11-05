import { supabase } from "@/lib/supabase";
import type { StudentSchedule } from "@/lib/types";
import { jstTodayString, jstTomorrowString, activeOnOrFilter } from "@/lib/schedule-effective";

export async function getSchedulesForStudent(
  studentId: number
): Promise<StudentSchedule[]> {
  const { data, error } = await supabase
    .from("student_schedules")
    .select("*")
    .eq("student_id", studentId)
    .order("day_of_week")
    .order("period_id");
  if (error) throw error;
  return data;
}

export async function getSchedulesForDay(
  dayOfWeek: number
): Promise<StudentSchedule[]> {
  const { data, error } = await supabase
    .from("student_schedules")
    .select("*")
    .eq("day_of_week", dayOfWeek);
  if (error) throw error;
  return data;
}

// 生徒一覧の表に出す「最新の状態」。終了日が入っていない行だけ(=現在有効な行と、
// 翌日から有効になる予定の行の両方)を返す。終了済みの古い行は含めない。
export async function getAllSchedules(): Promise<StudentSchedule[]> {
  const { data, error } = await supabase
    .from("student_schedules")
    .select("*")
    .is("effective_until", null)
    .order("day_of_week")
    .order("period_id");
  if (error) throw error;
  return data;
}

export async function addSchedule(input: {
  student_id: number;
  day_of_week: number;
  period_id: number;
  subject_id: number;
  // 省略すると今日(日本時間)から有効。新規登録の生徒はこれでよい。
  effective_from?: string;
}): Promise<StudentSchedule> {
  const { data, error } = await supabase
    .from("student_schedules")
    .insert({ ...input, effective_from: input.effective_from ?? jstTodayString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSchedule(id: number) {
  const { error } = await supabase.from("student_schedules").delete().eq("id", id);
  if (error) throw error;
}

// 表形式の一括編集で「授業科目」「授業コマ」欄が入力された場合に、定期スケジュールを入れ替える。
// 変更は「変更した翌日以降」のみ反映し、当日以前の日付の予定は変えない。
//  ・変わらない行(曜日・コマ・科目が同じ)はそのまま残す
//  ・無くなった行: すでに有効になっているものは「今日まで」で終了(消さずに履歴として残す)。
//    まだ有効になっていない(翌日開始予定の)ものは、最初から無かったことにして削除する
//  ・増えた行: 翌日から有効として追加する
export async function replaceStudentSchedule(
  studentId: number,
  desired: { day_of_week: number; period_id: number; subject_id: number }[]
) {
  const today = jstTodayString();
  const tomorrow = jstTomorrowString();

  const { data: open, error } = await supabase
    .from("student_schedules")
    .select("*")
    .eq("student_id", studentId)
    .is("effective_until", null);
  if (error) throw error;
  const existing = (open ?? []) as StudentSchedule[];

  const key = (r: { day_of_week: number; period_id: number; subject_id: number }) =>
    `${r.day_of_week}:${r.period_id}:${r.subject_id}`;
  const desiredKeys = new Set(desired.map(key));
  const existingKeys = new Set(existing.map(key));

  for (const row of existing) {
    if (desiredKeys.has(key(row))) continue;
    if (row.effective_from > today) {
      const { error: delError } = await supabase.from("student_schedules").delete().eq("id", row.id);
      if (delError) throw delError;
    } else {
      const { error: endError } = await supabase
        .from("student_schedules")
        .update({ effective_until: today })
        .eq("id", row.id);
      if (endError) throw endError;
    }
  }

  for (const row of desired) {
    if (existingKeys.has(key(row))) continue;
    await addSchedule({ student_id: studentId, ...row, effective_from: tomorrow });
  }
}

// 業務ルール本体は lib/schedule-rules.ts (クライアントからも安全にimport可能)
export { isValidEightyMinutePair } from "@/lib/schedule-rules";
