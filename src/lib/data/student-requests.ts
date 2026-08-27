import { supabase } from "@/lib/supabase";

export const ADDITIONAL_REQUEST_LABEL: Record<string, string> = {
  textbook_purchase: "テキストの追加購入",
  interview: "面談の希望",
  lesson_count_change: "コマ数の変更",
  fixed_slot_change: "固定コマの変更",
};

export type StudentRequest = {
  id: number;
  student_id: number;
  request_type: keyof typeof ADDITIONAL_REQUEST_LABEL;
  details: Record<string, string>;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  requested_at: string;
  processed_at: string | null;
  studentName: string;
};

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
