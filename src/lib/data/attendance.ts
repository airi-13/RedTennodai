import { supabase } from "@/lib/supabase";
import type { AttendanceSlot, AttendanceStatus } from "@/lib/types";

// 'YYYY-MM-DD' の日付文字列から 0=日〜6=土 を返す。
// new Date('YYYY-MM-DD') はUTC扱いになりタイムゾーンによって曜日がずれるため、
// 年月日を分解してローカルタイムで組み立てる。
export function dayOfWeekFromDateString(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

// 指定日の出欠一覧を取得する。
// 1. student_schedulesからその曜日の「予定」を取得
// 2. attendance_recordsのその日の「実績」で上書き
// 3. 予定にない実績(振替追加分)は追加で表示
export async function getAttendanceSlotsForDate(
  date: string
): Promise<AttendanceSlot[]> {
  const dayOfWeek = dayOfWeekFromDateString(date);

  const [scheduleRes, recordRes] = await Promise.all([
    supabase
      .from("student_schedules")
      .select("id, student_id, period_id, subject_id, students!inner(name, status)")
      .eq("day_of_week", dayOfWeek)
      .eq("students.status", "active"),
    supabase.from("attendance_records").select("*").eq("date", date),
  ]);

  if (scheduleRes.error) throw scheduleRes.error;
  if (recordRes.error) throw recordRes.error;

  const recordMap = new Map(
    (recordRes.data ?? []).map((r) => [`${r.student_id}:${r.period_id}`, r])
  );

  const slots: AttendanceSlot[] = (scheduleRes.data ?? []).map((s: any) => {
    const key = `${s.student_id}:${s.period_id}`;
    const record = recordMap.get(key);
    recordMap.delete(key); // マッチした分は消し、残りは予定外の追加分として後で処理する
    return {
      scheduleId: s.id,
      studentId: s.student_id,
      studentName: s.students.name,
      periodId: s.period_id,
      subjectId: record ? record.subject_id : s.subject_id,
      attendanceRecordId: record ? record.id : null,
      status: record ? (record.status as AttendanceStatus) : null,
      note: record ? record.note : null,
    } satisfies AttendanceSlot;
  });

  // 定期スケジュールに対応行がない出欠記録(振替追加分など)
  const extraRecords = [...recordMap.values()];
  if (extraRecords.length > 0) {
    const extraStudentIds = extraRecords.map((r) => r.student_id);
    const { data: extraStudents, error } = await supabase
      .from("students")
      .select("id, name")
      .in("id", extraStudentIds);
    if (error) throw error;
    const nameMap = new Map((extraStudents ?? []).map((s) => [s.id, s.name]));
    for (const r of extraRecords) {
      slots.push({
        scheduleId: null,
        studentId: r.student_id,
        studentName: nameMap.get(r.student_id) ?? `ID:${r.student_id}`,
        periodId: r.period_id,
        subjectId: r.subject_id,
        attendanceRecordId: r.id,
        status: r.status as AttendanceStatus,
        note: r.note,
      });
    }
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
}) {
  const { error } = await supabase
    .from("attendance_records")
    .upsert(input, { onConflict: "student_id,date,period_id" });
  if (error) throw error;
}

export async function deleteAttendanceRecord(id: number) {
  const { error } = await supabase
    .from("attendance_records")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
