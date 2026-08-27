"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAnonClient } from "@/lib/supabase-anon";

const TYPES = ["textbook_purchase", "interview", "lesson_count_change", "fixed_slot_change"] as const;
type AdditionalRequestType = (typeof TYPES)[number];

export async function submitAdditionalRequestAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createAnonClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "ログインし直してください" };

  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!student) return { error: "生徒情報が見つかりません" };

  const requestType = String(formData.get("requestType") ?? "").trim() as AdditionalRequestType;
  if (!TYPES.includes(requestType)) return { error: "申請内容が正しくありません" };

  const reason = String(formData.get("reason") ?? "").trim();
  const details: Record<string, string> = {};

  if (requestType === "textbook_purchase") {
    details.textbook_id = String(formData.get("textbookId") ?? "").trim();
    details.quantity = String(formData.get("quantity") ?? "1").trim();
    if (!details.textbook_id) return { error: "購入するテキストを選択してください" };
    const quantity = Number(details.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) return { error: "冊数は1〜10冊で指定してください" };
    const { data: textbook } = await supabase.from("textbooks").select("title").eq("id", Number(details.textbook_id)).maybeSingle();
    if (!textbook) return { error: "選択したテキストが見つかりません" };
    details.textbook_title = textbook.title;
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

    const { data: currentSchedule } = await supabase
      .from("student_schedules")
      .select("day_of_week, period_id, periods(name)")
      .eq("id", Number(details.current_schedule_id))
      .eq("student_id", student.id)
      .maybeSingle();
    if (!currentSchedule) return { error: "変更元の固定コマが見つかりません" };
    details.current_day_of_week = String(currentSchedule.day_of_week);
    details.current_period_id = String(currentSchedule.period_id);
    details.current_period_name = (currentSchedule as any).periods?.name ?? "";
  }

  const { error } = await supabase.from("student_requests").insert({
    student_id: student.id,
    request_type: requestType,
    details,
    reason: reason || null,
    status: "pending",
  });
  if (error) return { error: `申請に失敗しました (${error.message})` };

  revalidatePath("/my/request");
  revalidatePath("/requests");
  redirect("/my/request?submitted=1");
}
