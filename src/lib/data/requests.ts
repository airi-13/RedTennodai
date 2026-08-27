import { supabase } from "@/lib/supabase";
import { upsertAttendance } from "@/lib/data/attendance";
import { dayOfWeekFromDateString } from "@/lib/data/attendance";
import type { AttendanceRequest, AttendanceRequestWithStudent, RequestStatus } from "@/lib/types";

export async function listRequests(
  status?: RequestStatus
): Promise<AttendanceRequestWithStudent[]> {
  let query = supabase
    .from("attendance_requests")
    .select("*, students(name)")
    .order("requested_at", { ascending: false });
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    id: r.id,
    student_id: r.student_id,
    request_type: r.request_type,
    target_date: r.target_date,
    target_period_id: r.target_period_id,
    reason: r.reason,
    status: r.status,
    makeup_date: r.makeup_date,
    makeup_period_id: r.makeup_period_id,
    requested_at: r.requested_at,
    processed_at: r.processed_at,
    studentName: r.students?.name ?? `ID:${r.student_id}`,
  }));
}

export async function setRequestStatus(id: number, status: RequestStatus) {
  const { error } = await supabase
    .from("attendance_requests")
    .update({ status, processed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// 生徒が登録した内容(承認済み)を管理者が取り消す。対象の出欠記録も削除して未確定に戻す。
export async function cancelApprovedRequest(id: number) {
  const { data: req, error } = await supabase
    .from("attendance_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  const request = req as AttendanceRequest;

  if (request.target_period_id) {
    await supabase
      .from("attendance_records")
      .delete()
      .eq("student_id", request.student_id)
      .eq("date", request.target_date)
      .eq("period_id", request.target_period_id);
  }

  await setRequestStatus(id, "rejected");
}
// 申請を承認し、対象のコマが指定されていればattendance_recordsにも自動反映する。
// - 欠席申請: target_period_idのコマをstatus='absent'に
// - 振替申請: target_period_idのコマをstatus='makeup'にし、振替先(makeup_date/period)を記録
// target_period_idが未指定の場合は、どのコマか特定できないためattendance_requestsのステータス変更のみ行う。
export async function approveRequest(id: number): Promise<{ reflected: boolean }> {
  const { data: req, error } = await supabase
    .from("attendance_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  const request = req as AttendanceRequest;

  let reflected = false;

  if (request.target_period_id) {
    const dayOfWeek = dayOfWeekFromDateString(request.target_date);
    const { data: schedule } = await supabase
      .from("student_schedules")
      .select("subject_id")
      .eq("student_id", request.student_id)
      .eq("day_of_week", dayOfWeek)
      .eq("period_id", request.target_period_id)
      .maybeSingle();

    if (schedule) {
      await upsertAttendance({
        student_id: request.student_id,
        date: request.target_date,
        period_id: request.target_period_id,
        subject_id: schedule.subject_id,
        status: request.request_type === "makeup" ? "makeup" : "absent",
        makeup_date: request.request_type === "makeup" ? request.makeup_date : null,
        makeup_period_id:
          request.request_type === "makeup" ? request.makeup_period_id : null,
      });
      reflected = true;
    }
  }

  await setRequestStatus(id, "approved");
  return { reflected };
}
