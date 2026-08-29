import { supabase } from "@/lib/supabase";
import type { AttendanceSlot, AttendanceStatus } from "@/lib/types";

export function dayOfWeekFromDateString(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

async function studentNameMap(studentIds: number[]): Promise<Map<number, string>> {
  if (studentIds.length === 0) return new Map();
  const { data, error } = await supabase.from("students").select("id, name").in("id", studentIds);
  if (error) throw error;
  return new Map((data ?? []).map((s) => [s.id, s.name]));
}

export async function getAttendanceSlotsForDate(date: string): Promise<AttendanceSlot[]> {
  const dayOfWeek = dayOfWeekFromDateString(date);
  const [scheduleRes, recordRes, transferInRes] = await Promise.all([
    supabase
      .from("student_schedules")
      .select("id, student_id, period_id, subject_id, students!inner(name, status)")
      .eq("day_of_week", dayOfWeek)
      .eq("students.status", "active"),
    supabase.from("attendance_records").select("*").eq("date", date),
    supabase.from("attendance_records").select("*").eq("makeup_date", date),
  ]);

  if (scheduleRes.error) throw scheduleRes.error;
  if (recordRes.error) throw recordRes.error;
  if (transferInRes.error) throw transferInRes.error;

  const recordMap = new Map((recordRes.data ?? []).map((r) => [`${r.student_id}:${r.period_id}`, r]));
  const slots: AttendanceSlot[] = (scheduleRes.data ?? []).map((s: any) => {
    const record = recordMap.get(`${s.student_id}:${s.period_id}`);
    recordMap.delete(`${s.student_id}:${s.period_id}`);
    return {
      scheduleId: s.id,
      studentId: s.student_id,
      studentName: s.students.name,
      periodId: s.period_id,
      subjectId: record ? record.subject_id : s.subject_id,
      attendanceRecordId: record ? record.id : null,
      status: record ? (record.status as AttendanceStatus) : null,
      note: record ? record.note : null,
      makeupDate: record?.makeup_date ?? null,
      makeupPeriodId: record?.makeup_period_id ?? null,
      makeupAttendanceStatus: record?.makeup_attendance_status ?? null,
    } satisfies AttendanceSlot;
  });

  const extraRecords = [...recordMap.values()];
  const extraNames = await studentNameMap(extraRecords.map((r) => r.student_id));
  for (const r of extraRecords) {
    slots.push({
      scheduleId: null,
      studentId: r.student_id,
      studentName: extraNames.get(r.student_id) ?? `ID:${r.student_id}`,
      periodId: r.period_id,
      subjectId: r.subject_id,
      attendanceRecordId: r.id,
      status: r.status as AttendanceStatus,
      note: r.note,
      makeupDate: r.makeup_date,
      makeupPeriodId: r.makeup_period_id,
      makeupAttendanceStatus: r.makeup_attendance_status ?? null,
    });
  }

  const transferRecords = transferInRes.data ?? [];
  const transferNames = await studentNameMap(transferRecords.map((r) => r.student_id));
  for (const r of transferRecords) {
    if (!r.makeup_period_id) continue;
    slots.push({
      scheduleId: null,
      studentId: r.student_id,
      studentName: transferNames.get(r.student_id) ?? `ID:${r.student_id}`,
      periodId: r.makeup_period_id,
      subjectId: r.subject_id,
      attendanceRecordId: r.id,
      // 振替授業側の出欠は元コマの記録とは独立して保持する。
      status: (r.makeup_attendance_status as AttendanceStatus | null) ?? "makeup",
      note: r.note,
      makeupDate: r.makeup_date,
      makeupPeriodId: r.makeup_period_id,
      makeupAttendanceStatus: r.makeup_attendance_status ?? null,
      isTransferAddition: true,
      transferFromDate: r.date,
      transferFromPeriodId: r.period_id,
    });
  }

  return slots;
}

export async function upsertAttendance(input: {
  student_id: number;
  date: string;
  period_id: number;
  subject_id: number;
  status: AttendanceStatus;
  note?: string | null;
  makeup_date?: string | null;
  makeup_period_id?: number | null;
  makeup_attendance_status?: AttendanceStatus | null;
}) {
  const { error } = await supabase.from("attendance_records").upsert(input, { onConflict: "student_id,date,period_id" });
  if (error) throw error;
}

export async function updateMakeupDestinationStatus(recordId: number, status: AttendanceStatus) {
  const { error } = await supabase
    .from("attendance_records")
    .update({ makeup_attendance_status: status })
    .eq("id", recordId)
    .not("makeup_date", "is", null)
    .not("makeup_period_id", "is", null);
  if (error) throw error;
}

export async function deleteAttendanceRecord(id: number) {
  const { error } = await supabase.from("attendance_records").delete().eq("id", id);
  if (error) throw error;
}

export async function getAttendanceRecordsForStudentMonth(studentId: number, year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const [byDate, byMakeupDate] = await Promise.all([
    supabase.from("attendance_records").select("*").eq("student_id", studentId).gte("date", start).lte("date", end),
    supabase.from("attendance_records").select("*").eq("student_id", studentId).gte("makeup_date", start).lte("makeup_date", end),
  ]);
  if (byDate.error) throw byDate.error;
  if (byMakeupDate.error) throw byMakeupDate.error;
  return { byDate: byDate.data ?? [], byMakeupDate: byMakeupDate.data ?? [] };
}
