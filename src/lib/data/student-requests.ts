import { supabase } from "@/lib/supabase";
import type { StudentRequest } from "./student-request-types";

export async function listStudentRequests(): Promise<StudentRequest[]> {
  const { data, error } = await supabase
    .from("student_requests")
    .select("*, students(name)")
    .order("requested_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    student_id: r.student_id,
    request_type: r.request_type,
    details: r.details ?? {},
    reason: r.reason,
    status: r.status,
    requested_at: r.requested_at,
    processed_at: r.processed_at,
    studentName: r.students?.name ?? `ID:${r.student_id}`,
  }));
}

export async function setStudentRequestStatus(id: number, status: "approved" | "rejected") {
  const { error } = await supabase
    .from("student_requests")
    .update({ status, processed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
