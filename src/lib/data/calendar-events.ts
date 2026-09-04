import { supabase } from "@/lib/supabase";
import type { AttendanceStatus } from "@/lib/types";

export type CalendarEventType = "lesson" | "teacher" | "juku";
export type CalendarEventVisibility = "admin_only" | "selected" | "all";

export type CalendarEvent = {
  id: number;
  event_type: CalendarEventType;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  period_id: number | null;
  subject_id: number | null;
  title: string;
  note: string | null;
  visibility: CalendarEventVisibility;
};

export type CalendarEventForStudent = CalendarEvent & {
  attendanceStatus: AttendanceStatus | null;
};

export type CalendarEventStudentLink = {
  student_id: number;
  attendance_status: AttendanceStatus | null;
  studentName: string;
};

function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export async function createCalendarEvent(input: {
  eventType: CalendarEventType;
  eventDate: string;
  startTime?: string | null;
  endTime?: string | null;
  periodId?: number | null;
  subjectId?: number | null;
  title: string;
  note?: string | null;
  visibility: CalendarEventVisibility;
  studentIds?: number[];
}): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      event_type: input.eventType,
      event_date: input.eventDate,
      start_time: input.startTime || null,
      end_time: input.endTime || null,
      period_id: input.periodId || null,
      subject_id: input.subjectId || null,
      title: input.title,
      note: input.note || null,
      visibility: input.visibility,
    })
    .select()
    .single();
  if (error) throw error;

  let studentIds = input.studentIds ?? [];

  // lessonタイプで「全員」を選んだ場合は、在籍中の全生徒を対象として紐付ける
  // (出欠を生徒ごとに記録する必要があるため、visibilityだけでなく実データが要る)。
  if (input.eventType === "lesson" && input.visibility === "all") {
    const { data: activeStudents, error: sErr } = await supabase
      .from("students")
      .select("id")
      .eq("status", "active");
    if (sErr) throw sErr;
    studentIds = (activeStudents ?? []).map((s) => s.id);
  }

  if (studentIds.length > 0) {
    const { error: linkErr } = await supabase
      .from("calendar_event_students")
      .insert(studentIds.map((studentId) => ({ event_id: data.id, student_id: studentId })));
    if (linkErr) throw linkErr;
  }

  return data as CalendarEvent;
}

export async function deleteCalendarEvent(id: number) {
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) throw error;
}

// 管理者のカレンダー(/dashboard)向け: その月の全予定(可視性を問わず)
export async function listCalendarEventsForMonth(
  year: number,
  month: number
): Promise<CalendarEvent[]> {
  const { start, end } = monthRange(year, month);
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*")
    .gte("event_date", start)
    .lte("event_date", end);
  if (error) throw error;
  return (data ?? []) as CalendarEvent[];
}

// 生徒本人のカレンダー(/my)向け: 「全員」または自分が対象の予定のみ
export async function listCalendarEventsForStudentMonth(
  studentId: number,
  year: number,
  month: number
): Promise<CalendarEventForStudent[]> {
  const { start, end } = monthRange(year, month);

  const [ownRes, allRes] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("*, calendar_event_students!inner(attendance_status, student_id)")
      .gte("event_date", start)
      .lte("event_date", end)
      .eq("calendar_event_students.student_id", studentId),
    supabase
      .from("calendar_events")
      .select("*")
      .eq("visibility", "all")
      .gte("event_date", start)
      .lte("event_date", end),
  ]);
  if (ownRes.error) throw ownRes.error;
  if (allRes.error) throw allRes.error;

  const seen = new Set<number>();
  const result: CalendarEventForStudent[] = [];

  for (const row of (ownRes.data ?? []) as any[]) {
    const link = Array.isArray(row.calendar_event_students)
      ? row.calendar_event_students[0]
      : row.calendar_event_students;
    const { calendar_event_students, ...event } = row;
    result.push({ ...(event as CalendarEvent), attendanceStatus: link?.attendance_status ?? null });
    seen.add(row.id);
  }
  for (const row of (allRes.data ?? []) as CalendarEvent[]) {
    if (seen.has(row.id)) continue;
    result.push({ ...row, attendanceStatus: null });
  }
  return result;
}

// 出欠登録画面(/attendance)向け: その日のlessonタイプの予定と対象生徒一覧
export async function listLessonEventsForDate(date: string): Promise
  {
    event: CalendarEvent;
    students: CalendarEventStudentLink[];
  }[]
> {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("*, calendar_event_students(student_id, attendance_status, students(name))")
    .eq("event_type", "lesson")
    .eq("event_date", date);
  if (error) throw error;

  return ((data ?? []) as any[]).map((row) => {
    const { calendar_event_students, ...event } = row;
    const students: CalendarEventStudentLink[] = (calendar_event_students ?? []).map((l: any) => ({
      student_id: l.student_id,
      attendance_status: l.attendance_status,
      studentName: l.students?.name ?? `ID:${l.student_id}`,
    }));
    return { event: event as CalendarEvent, students };
  });
}

export async function setCalendarEventAttendance(
  eventId: number,
  studentId: number,
  status: AttendanceStatus
) {
  const { error } = await supabase
    .from("calendar_event_students")
    .update({ attendance_status: status })
    .eq("event_id", eventId)
    .eq("student_id", studentId);
  if (error) throw error;
}
