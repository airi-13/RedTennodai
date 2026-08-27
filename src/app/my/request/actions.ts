"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAnonClient } from "@/lib/supabase-anon";
import { supabase as adminSupabase } from "@/lib/supabase";
import {
  isBeforeRegistrationDeadline,
  isValidMakeupSourceSlot,
  isValidMakeupDestinationSlot,
} from "@/lib/attendance-rules";
import { dayOfWeekFromDateString } from "@/lib/data/attendance";

// 欠席・振替は管理者の承認を待たず、生徒が申請した時点で確定する。
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

  const requestType = String(formData.get("requestType") ?? "").trim();
  const targetDate = String(formData.get("targetDate") ?? "").trim();
  const targetPeriodIdRaw = formData.get("targetPeriodId");
  const targetPeriodId = targetPeriodIdRaw ? Number(targetPeriodIdRaw) : null;
  const reason = String(formData.get("reason") ?? "").trim();
  const makeupDate = String(formData.get("makeupDate") ?? "").trim();
  const makeupPeriodIdRaw = formData.get("makeupPeriodId");
  const makeupPeriodId = makeupPeriodIdRaw ? Number(makeupPeriodIdRaw) : null;

  if (requestType !== "absence" && requestType !== "makeup") {
    return { error: "申請内容が正しくありません" };
  }
  if (!targetDate) return { error: "対象日を入力してください" };
  if (!targetPeriodId) return { error: "対象のコマを選択してください" };

  const { data: period } = await supabase
    .from("periods")
    .select("start_time")
    .eq("id", targetPeriodId)
    .maybeSingle();

  const now = new Date();
  if (requestType === "absence") {
    if (!isBeforeRegistrationDeadline(targetDate, period?.start_time ?? null, now)) {
      return { error: "この授業は開始5分前を過ぎているため、欠席申請できません。" };
    }
  } else {
    if (!makeupDate || !makeupPeriodId) {
      return { error: "振替日と振替コマを選択してください。" };
    }
    if (!isValidMakeupSourceSlot(targetDate, period?.start_time ?? null, now)) {
      return { error: "振替申請の元授業は、現在時刻から5分以上先の授業を選択してください。" };
    }

    const { data: makeupPeriod } = await supabase
      .from("periods")
      .select("start_time")
      .eq("id", makeupPeriodId)
      .maybeSingle();

    if (!isValidMakeupDestinationSlot(targetDate, makeupDate, makeupPeriod?.start_time ?? null, now)) {
      return { error: "振替先は現在時刻以降、元授業日の4週間後23:59までのコマを選択してください。" };
    }
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
    return { error: "この日・コマの授業情報が見つかりませんでした。" };
  }

  const { error: reqError } = await supabase.from("attendance_requests").insert({
    student_id: student.id,
    request_type: requestType,
    target_date: targetDate,
    target_period_id: targetPeriodId,
    reason: reason || null,
    makeup_date: requestType === "makeup" ? makeupDate : null,
    makeup_period_id: requestType === "makeup" ? makeupPeriodId : null,
    status: "approved",
    processed_at: now.toISOString(),
  });
  if (reqError) return { error: `申請に失敗しました (${reqError.message})` };

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
