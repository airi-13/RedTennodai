"use server";

import { createAnonClient } from "@/lib/supabase-anon";

function parseDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export async function registerMakeupAction(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createAnonClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインし直してください" };

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!student) return { error: "生徒情報が見つかりません" };

  const recordId = Number(formData.get("recordId"));
  const makeupDate = String(formData.get("makeupDate") ?? "").trim();
  const makeupPeriodId = Number(formData.get("makeupPeriodId"));
  if (!Number.isInteger(recordId) || !makeupDate || !Number.isInteger(makeupPeriodId) || makeupPeriodId <= 0) {
    return { error: "振替日と振替コマを入力してください" };
  }

  const { data: record } = await supabase
    .from("attendance_records")
    .select("id, student_id, date, status, makeup_date, makeup_period_id")
    .eq("id", recordId)
    .eq("student_id", student.id)
    .maybeSingle();
  if (!record) return { error: "振替対象の授業が見つかりません" };
  if (record.status !== "absent" && record.status !== "makeup") return { error: "この授業は振替登録の対象ではありません" };
  if (record.makeup_date || record.makeup_period_id) return { error: "この授業はすでに振替登録されています" };

  const sourceDate = parseDate(record.date);
  const destinationDate = parseDate(makeupDate);
  if (!sourceDate || !destinationDate) return { error: "日付が正しくありません" };
  const maxDate = new Date(sourceDate);
  maxDate.setDate(maxDate.getDate() + 28);
  if (destinationDate < sourceDate || destinationDate > maxDate) {
    return { error: "振替日は欠席日から4週間以内で選択してください" };
  }

  const { error } = await supabase
    .from("attendance_records")
    .update({ makeup_date: toIso(destinationDate), makeup_period_id: makeupPeriodId })
    .eq("id", record.id)
    .eq("student_id", student.id);
  if (error) return { error: `振替登録に失敗しました (${error.message})` };

  return { success: true };
}
