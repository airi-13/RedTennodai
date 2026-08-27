"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAnonClient } from "@/lib/supabase-anon";
import { supabase as adminSupabase } from "@/lib/supabase";
import { isBeforeRegistrationDeadline, isValidMakeupDateRange } from "@/lib/attendance-rules";
import { dayOfWeekFromDateString } from "@/lib/data/attendance";

// 欠席・振替は管理者の承認を待たず、生徒が登録した時点で確定する。
// (1) attendance_requests に記録(履歴・監査用、status='approved'で即確定)
// (2) attendance_records にも直接反映(RLSを回避するためservice role client使用。
//     ただし対象生徒がログイン中の本人であることは先にanon client+セッションで検証済み)
export async function submitRequestAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createAnonClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインし直してください" };

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!student) return { error: "生徒情報が見つかりません" };

  const requestType = String(formData.get("requestType") ?? "absence") as "absence" | "makeup";
  const targetDate = String(formData.get("targetDate") ?? "");
  const targetPeriodIdRaw = formData.get("targetPeriodId");
  const targetPeriodId = targetPeriodIdRaw ? Number(targetPeriodIdRaw) : null;
  const reason = String(formData.get("reason") ?? "");
  const makeupDate = String(formData.get("makeupDate") ?? "") || null;
  const makeupPeriodIdRaw = formData.get("makeupPeriodId");
  const makeupPeriodId = makeupPeriodIdRaw ? Number(makeupPeriodIdRaw) : null;

  if (!targetDate) return { error: "対象日を入力してください" };
  if (!targetPeriodId) return { error: "対象のコマを選択してください" };

  // 対象コマの開始時刻を取得し、5分前を過ぎていないか確認
  const { data: period } = await supabase
    .from("periods")
    .select("start_time")
    .eq("id", targetPeriodId)
    .maybeSingle();
  if (!isBeforeRegistrationDeadline(targetDate, period?.start_time ?? null)) {
    return { error: "この授業の開始5分前を過ぎているため、登録できません。教室に直接ご連絡ください。" };
  }

  if (makeupDate && !isValidMakeupDateRange(targetDate, makeupDate)) {
    return { error: "振替日は元の授業日から4週間以内の日付を選択してください。" };
  }

  // 対象コマの科目を、生徒の定期スケジュールから解決する
  const dayOfWeek = dayOfWeekFromDateString(targetDate);
  const { data: schedule } = await supabase
    .from("student_schedules")
    .select("subject_id")
    .eq("student_id", student.id)
    .eq("day_of_week", dayOfWeek)
    .eq("period_id", targetPeriodId)
    .maybeSingle();
  if (!schedule) {
    return { error: "この日・コマの定期スケジュールが見つかりませんでした。教室にご連絡ください。" };
  }

  const { error: reqError } = await supabase.from("attendance_requests").insert({
    student_id: student.id,
    request_type: requestType,
    target_date: targetDate,
    target_period_id: targetPeriodId,
    reason: reason || null,
    makeup_date: makeupDate,
    makeup_period_id: makeupPeriodId,
    status: "approved",
    processed_at: new Date().toISOString(),
  });
  if (reqError) return { error: `送信に失敗しました (${reqError.message})` };

  const { error: recError } = await adminSupabase.from("attendance_records").upsert(
    {
      student_id: student.id,
      date: targetDate,
      period_id: targetPeriodId,
      subject_id: schedule.subject_id,
      status: requestType === "makeup" ? "makeup" : "absent",
      makeup_date: requestType === "makeup" ? makeupDate : null,
      makeup_period_id: requestType === "makeup" ? makeupPeriodId : null,
      note: reason || null,
    },
    { onConflict: "student_id,date,period_id" }
  );
  if (recError) return { error: `出欠への反映に失敗しました (${recError.message})` };

  revalidatePath("/my");
  revalidatePath("/attendance");
  redirect("/my?submitted=1");
}

// 欠席登録済み、または振替先未定のコマに、後から振替日を追加する。
export async function addMakeupDateAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createAnonClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "ログインし直してください" };

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!student) return { error: "生徒情報が見つかりません" };

  const attendanceRecordId = Number(formData.get("attendanceRecordId"));
  const targetDate = String(formData.get("targetDate") ?? "");
  const makeupDate = String(formData.get("makeupDate") ?? "");
  const makeupPeriodIdRaw = formData.get("makeupPeriodId");
  const makeupPeriodId = makeupPeriodIdRaw ? Number(makeupPeriodIdRaw) : null;

  if (!attendanceRecordId || !makeupDate || !makeupPeriodId) {
    return { error: "振替日・コマを入力してください" };
  }
  if (!isValidMakeupDateRange(targetDate, makeupDate)) {
    return { error: "振替日は元の授業日から4週間以内の日付を選択してください。" };
  }

  // 本人の記録であることを確認してから更新
  const { data: record } = await adminSupabase
    .from("attendance_records")
    .select("id, student_id")
    .eq("id", attendanceRecordId)
    .maybeSingle();
  if (!record || record.student_id !== student.id) {
    return { error: "対象の記録が見つかりません" };
  }

  const { error } = await adminSupabase
    .from("attendance_records")
    .update({ status: "makeup", makeup_date: makeupDate, makeup_period_id: makeupPeriodId })
    .eq("id", attendanceRecordId);
  if (error) return { error: `更新に失敗しました (${error.message})` };

  revalidatePath("/my");
  revalidatePath("/attendance");
  redirect("/my?submitted=1");
}
