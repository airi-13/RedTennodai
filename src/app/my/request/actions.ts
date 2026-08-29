"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAnonClient } from "@/lib/supabase-anon";
import { supabase as adminSupabase } from "@/lib/supabase";
import { isBeforeRegistrationDeadline, isValidMakeupSourceSlot, isValidMakeupDestinationSlot } from "@/lib/attendance-rules";
import { dayOfWeekFromDateString } from "@/lib/data/attendance";

export async function submitRequestAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createAnonClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインし直してください" };

  const { data: student } = await supabase.from("students").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!student) return { error: "生徒情報が見つかりません" };

  const requestType = String(formData.get("requestType") ?? "").trim();
  const targetDate = String(formData.get("targetDate") ?? "").trim();
  const targetPeriodIdRaw = formData.get("targetPeriodId");
  const targetPeriodId = targetPeriodIdRaw ? Number(targetPeriodIdRaw) : null;
  const reason = String(formData.get("reason") ?? "").trim();
  const makeupDate = String(formData.get("makeupDate") ?? "").trim();
  const makeupPeriodIdRaw = formData.get("makeupPeriodId");
  const makeupPeriodId = makeupPeriodIdRaw ? Number(makeupPeriodIdRaw) : null;

  if (requestType !== "absence" && requestType !== "makeup") return { error: "申請内容が正しくありません" };
  if (!targetDate || !targetPeriodId) return { error: "対象の授業を選択してください" };

  const { data: makeupSource } = await adminSupabase
    .from("attendance_records")
    .select("id, subject_id, date, period_id, makeup_date, makeup_period_id")
    .eq("student_id", student.id)
    .eq("makeup_date", targetDate)
    .eq("makeup_period_id", targetPeriodId)
    .eq("status", "makeup")
    .maybeSingle();

  if (makeupSource) {
    if (requestType !== "absence") return { error: "振替授業からさらに振替することはできません。" };
    const { data: destinationPeriod } = await supabase.from("periods").select("start_time").eq("id", targetPeriodId).maybeSingle();
    const now = new Date();
    if (!isBeforeRegistrationDeadline(targetDate, destinationPeriod?.start_time ?? null, now)) {
      return { error: "この振替授業は開始5分前を過ぎているため、欠席申請できません。" };
    }

    const { error: reqError } = await supabase.from("attendance_requests").insert({
      student_id: student.id,
      request_type: "absence",
      target_date: targetDate,
      target_period_id: targetPeriodId,
      reason: reason || null,
      makeup_date: null,
      makeup_period_id: null,
      status: "approved",
      processed_at: now.toISOString(),
    });
    if (reqError) return { error: `申請に失敗しました (${reqError.message})` };

    const { error: updateError } = await adminSupabase
      .from("attendance_records")
      .update({ makeup_attendance_status: "absent", note: reason || null })
      .eq("id", makeupSource.id);
    if (updateError) return { error: `出欠への反映に失敗しました (${updateError.message})` };

    revalidatePath("/my");
    revalidatePath("/attendance");
    redirect("/my?submitted=1");
  }

  const { data: period } = await supabase.from("periods").select("start_time").eq("id", targetPeriodId).maybeSingle();
  const now = new Date();
  if (requestType === "absence") {
    if (!isBeforeRegistrationDeadline(targetDate, period?.start_time ?? null, now)) {
      return { error: "この授業は開始5分前を過ぎているため、欠席申請できません。" };
    }
  } else {
    if (!makeupDate || !makeupPeriodId) return { error: "振替日と振替コマを選択してください。" };
    if (!isValidMakeupSourceSlot(targetDate, period?.start_time ?? null, now)) {
      return { error: "振替申請の元授業は、現在時刻から5分以上先の授業を選択してください。" };
    }
    const { data: makeupPeriod } = await supabase.from("periods").select("start_time").eq("id", makeupPeriodId).maybeSingle();
    if (!isValidMakeupDestinationSlot(targetDate, makeupDate, makeupPeriod?.start_time ?? null, now)) {
      return { error: "振替授業は現在時刻以降、元授業日の4週間後23:59までのコマを選択してください。" };
    }
  }

  const dayOfWeek = dayOfWeekFromDateString(targetDate);
  const { data: schedule } = await supabase
    .from("student_schedules")
    .select("subject_id")
    .eq("student_id", student.id)
    .eq("day_of_week", dayOfWeek)
    .eq("period_id", targetPeriodId)
    .maybeSingle();
  if (!schedule) return { error: "この日・コマの授業情報が見つかりませんでした。" };

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

  const { error: recError } = await adminSupabase.from("attendance_records").upsert({
    student_id: student.id,
    date: targetDate,
    period_id: targetPeriodId,
    subject_id: schedule.subject_id,
    status: requestType === "makeup" ? "makeup" : "absent",
    makeup_date: requestType === "makeup" ? makeupDate : null,
    makeup_period_id: requestType === "makeup" ? makeupPeriodId : null,
    makeup_attendance_status: null,
    note: reason || null,
  }, { onConflict: "student_id,date,period_id" });
  if (recError) return { error: `出欠への反映に失敗しました (${recError.message})` };

  revalidatePath("/my");
  revalidatePath("/attendance");
  redirect("/my?submitted=1");
}

const TYPES = ["textbook_purchase", "interview", "lesson_count_change", "fixed_slot_change"] as const;
type AdditionalRequestType = (typeof TYPES)[number];

export async function submitAdditionalRequestAction(_prevState: { error?: string } | undefined, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createAnonClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインし直してください" };
  const { data: student } = await supabase.from("students").select("id").eq("auth_user_id", user.id).maybeSingle();
  if (!student) return { error: "生徒情報が見つかりません" };

  const requestType = String(formData.get("requestType") ?? "").trim() as AdditionalRequestType;
  if (!TYPES.includes(requestType)) return { error: "申請内容が正しくありません" };
  const reason = String(formData.get("reason") ?? "").trim();
  const details: Record<string, string> = {};

  if (requestType === "textbook_purchase") {
    details.textbook_id = String(formData.get("textbookId") ?? "").trim();
    details.textbook_title = String(formData.get("textbookTitle") ?? "").trim();
    details.quantity = String(formData.get("quantity") ?? "1").trim();
    if (!details.textbook_id || !details.textbook_title) return { error: "購入するテキストを選択してください" };
    const quantity = Number(details.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) return { error: "冊数は1〜10冊で指定してください" };
  }

  if (requestType === "interview") {
    details.preferred_date = String(formData.get("preferredDate") ?? "").trim();
    details.preferred_time = String(formData.get("preferredTime") ?? "").trim();
    if (!details.preferred_date || !details.preferred_time) return { error: "希望日と希望時間帯を入力してください" };
  }

  if (requestType === "lesson_count_change") {
    details.desired_count = String(formData.get("desiredCount") ?? "").trim();
    if (!details.desired_count) return { error: "希望する週のコマ数を選択してください" };
  }

  if (requestType === "fixed_slot_change") {
    details.current_schedule_id = String(formData.get("currentScheduleId") ?? "").trim();
    details.desired_day_of_week = String(formData.get("desiredDayOfWeek") ?? "").trim();
    details.desired_period_id = String(formData.get("desiredPeriodId") ?? "").trim();
    if (!details.current_schedule_id || !details.desired_day_of_week || !details.desired_period_id) return { error: "変更元と変更後の曜日・コマを指定してください" };
    const { data: currentSchedule } = await supabase.from("student_schedules").select("id, day_of_week, period_id").eq("id", Number(details.current_schedule_id)).eq("student_id", student.id).maybeSingle();
    if (!currentSchedule) return { error: "変更元の固定コマが見つかりません" };
    details.current_day_of_week = String(currentSchedule.day_of_week);
    details.current_period_id = String(currentSchedule.period_id);
  }

  const { error } = await supabase.from("student_requests").insert({ student_id: student.id, request_type: requestType, details, reason: reason || null, status: "pending" });
  if (error) return { error: `申請に失敗しました (${error.message})` };
  revalidatePath("/my/request");
  revalidatePath("/requests");
  redirect("/my/request?submitted=1");
}
