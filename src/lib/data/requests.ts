import { supabase } from "@/lib/supabase";
import type { AttendanceRequestWithStudent, RequestStatus } from "@/lib/types";

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
