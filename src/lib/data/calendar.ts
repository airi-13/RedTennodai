// 生徒本人・管理者トップページ用のカレンダーデータを合成する。
import { getSchedulesForStudent } from "@/lib/data/schedules";
import { getPeriods } from "@/lib/data/periods";
import { getSubjects } from "@/lib/data/subjects";
import {
  listAnnouncementsForMonth,
  listClosuresForMonth,
  resolveDayStatus,
} from "@/lib/data/announcements";
import { listSchoolEventsForMonth, listAllSchoolEventsForMonth } from "@/lib/data/school-events";
import { listTodosForMonth } from "@/lib/data/admin-todos";
import { getAttendanceRecordsForStudentMonth } from "@/lib/data/attendance";
import type { AttendanceStatus } from "@/lib/types";

export type LessonDisplayStatus = "scheduled" | AttendanceStatus | "makeup_added";

export type CalendarDayItem =
  | {
      type: "lesson";
      subject: string;
      periodLabel: string;
      status: LessonDisplayStatus;
      attendanceRecordId: number | null;
      makeupAttendanceStatus?: AttendanceStatus | null;
      transferToDate?: string | null;
      transferToPeriodId?: number | null;
      transferFromDate?: string | null;
      transferFromPeriodLabel?: string | null;
    }
  | { type: "announcement"; title: string; timeRange: string | null; note: string | null }
  | { type: "school_event"; title: string; note: string | null };

export type CalendarDay = {
  date: string;
  status: "closed" | "open";
  items: CalendarDayItem[];
};

export async function buildStudentCalendar(params: {
  studentId: number;
  schoolId: string | null;
  year: number;
  month: number;
}): Promise<CalendarDay[]> {
  const { studentId, schoolId, year, month } = params;

  const [schedules, periods, subjects, announcements, closures, schoolEvents, records] =
    await Promise.all([
      getSchedulesForStudent(studentId),
      getPeriods(),
      getSubjects(),
      listAnnouncementsForMonth(year, month),
      listClosuresForMonth(year, month),
      schoolId ? listSchoolEventsForMonth(schoolId, year, month) : Promise.resolve([]),
      getAttendanceRecordsForStudentMonth(studentId, year, month),
    ]);

  const periodById = new Map(periods.map((p) => [p.id, p.name]));
  const subjectById = new Map(subjects.map((s) => [s.id, s.name]));
  const recordByDateAndPeriod = new Map(
    records.byDate.map((r) => [`${r.date}:${r.period_id}`, r])
  );
  const transferInByDate = new Map<string, typeof records.byMakeupDate>();
  for (const r of records.byMakeupDate) {
    if (!r.makeup_date) continue;
    const list = transferInByDate.get(r.makeup_date) ?? [];
    list.push(r);
    transferInByDate.set(r.makeup_date, list);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const days: CalendarDay[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const status = resolveDayStatus(date, closures);
    const weekday = date.getDay();
    const items: CalendarDayItem[] = [];

    for (const s of schedules.filter((ws) => ws.day_of_week === weekday)) {
      const record = recordByDateAndPeriod.get(`${iso}:${s.period_id}`);
      items.push({
        type: "lesson",
        subject: subjectById.get(record ? record.subject_id : s.subject_id) ?? "",
        periodLabel: periodById.get(s.period_id) ?? "",
        status: record ? (record.status as AttendanceStatus) : "scheduled",
        attendanceRecordId: record ? record.id : null,
        makeupAttendanceStatus: record?.status === "makeup" ? (record.makeup_attendance_status as AttendanceStatus | null) : null,
        transferToDate: record?.status === "makeup" ? record.makeup_date : null,
        transferToPeriodId: record?.status === "makeup" ? record.makeup_period_id : null,
      });
    }

    for (const r of transferInByDate.get(iso) ?? []) {
      items.push({
        type: "lesson",
        subject: subjectById.get(r.subject_id) ?? "",
        periodLabel: periodById.get(r.makeup_period_id ?? -1) ?? "(コマ未定)",
        status: "makeup_added",
        attendanceRecordId: r.id,
        makeupAttendanceStatus: (r.makeup_attendance_status as AttendanceStatus | null) ?? null,
        transferFromDate: r.date,
        transferFromPeriodLabel: periodById.get(r.period_id) ?? "",
      });
    }

    for (const a of announcements.filter((a) => a.event_date === iso)) {
      items.push({ type: "announcement", title: a.title, timeRange: a.time_range, note: a.note });
    }
    for (const e of schoolEvents.filter((e) => e.event_date === iso)) {
      items.push({ type: "school_event", title: e.title, note: e.note });
    }

    days.push({ date: iso, status, items });
  }

  return days;
}

export type AdminCalendarDayItem =
  | { type: "school_event"; title: string; schoolName: string; note: string | null }
  | { type: "announcement"; title: string; timeRange: string | null; note: string | null }
  | { type: "todo"; id: string; content: string; done: boolean };

export type AdminCalendarDay = {
  date: string;
  status: "closed" | "open";
  items: AdminCalendarDayItem[];
};

export async function buildAdminCalendar(
  year: number,
  month: number
): Promise<AdminCalendarDay[]> {
  const [announcements, closures, schoolEvents, todos] = await Promise.all([
    listAnnouncementsForMonth(year, month),
    listClosuresForMonth(year, month),
    listAllSchoolEventsForMonth(year, month),
    listTodosForMonth(year, month),
  ]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const days: AdminCalendarDay[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const status = resolveDayStatus(date, closures);
    const items: AdminCalendarDayItem[] = [];

    for (const e of schoolEvents.filter((e) => e.event_date === iso)) {
      items.push({ type: "school_event", title: e.title, schoolName: e.schoolName, note: e.note });
    }
    for (const a of announcements.filter((a) => a.event_date === iso)) {
      items.push({ type: "announcement", title: a.title, timeRange: a.time_range, note: a.note });
    }
    for (const t of todos.filter((t) => t.todo_date === iso)) {
      items.push({ type: "todo", id: t.id, content: t.content, done: t.done });
    }

    days.push({ date: iso, status, items });
  }

  return days;
}
