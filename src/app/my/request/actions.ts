"use server";

import { redirect } from "next/navigation";
import { createAnonClient } from "@/lib/supabase-anon";

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

  const requestType = String(formData.get("requestType") ?? "absence");
  const targetDate = String(formData.get("targetDate") ?? "");
  const targetPeriodIdRaw = formData.get("targetPeriodId");
  const targetPeriodId = targetPeriodIdRaw ? Number(targetPeriodIdRaw) : null;
  const reason = String(formData.get("reason") ?? "");
  const makeupDate = String(formData.get("makeupDate") ?? "") || null;
  const makeupPeriodIdRaw = formData.get("makeupPeriodId");
  const makeupPeriodId = makeupPeriodIdRaw ? Number(makeupPeriodIdRaw) : null;

  if (!targetDate) return { error: "対象日を入力してください" };
  if (requestType !== "absence" && requestType !== "makeup") {
    return { error: "申請内容が正しくありません" };
  }

  const { error } = await supabase.from("attendance_requests").insert({
    student_id: student.id,
    request_type: requestType,
    target_date: targetDate,
    target_period_id: targetPeriodId,
    reason: reason || null,
    makeup_date: makeupDate,
    makeup_period_id: makeupPeriodId,
  });

  if (error) return { error: `送信に失敗しました (${error.message})` };

  redirect("/my/request/complete");
}
