// その月の日付ごとの予定(自分の授業・出欠状況・塾のお知らせ・学校行事)を合成する。
import { getSchedulesForStudent } from "@/lib/data/schedules";
import { getPeriods } from "@/lib/data/periods";
import { getSubjects } from "@/lib/data/subjects";
import {
  listAnnouncementsForMonth,
  listClosuresForMonth,
  resolveDayStatus,
} from "@/lib/data/announcements";
import { listSchoolEventsForMonth } from "@/lib/data/school-events";
import { getAttendanceRecordsForStudentMonth } from "@/lib/data/attendance";
import type { AttendanceStatus } from "@/lib/types";

export type LessonDisplayStatus = "scheduled" | AttendanceStatus | "makeup_added";

export type CalendarDayItem =
  | {
      type: "lesson";
      subject: string;
      periodLabel: string;
      status: LessonDisplayStatus;
      // status='makeup'(振替元)のとき、振替先の日付
      transferToDate?: string | null;
      // status='makeup_added'(振替先)のとき、元の日付・コマ
      transferFromDate?: string | null;
      transferFromPeriodLabel?: string | null;
    }
  | { type: "announcement"; title: string; timeRange: string | null; note: string | null }
  | { type: "school_event"; title: string; note: string | null };

export type CalendarDay = {
  date: string; // YYYY-MM-DD
  status: "closed" | "open";
  items: CalendarDayItem[];
};

export async function buildStudentCalendar(params: {
  studentId: number;
  schoolId: string | null;
  year: number;
  month: number; // 1-12
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

  // 元の日付+コマ をキーにした出欠記録マップ(定期予定の上書き用)
  const recordByDateAndPeriod = new Map(
    params && records.byDate.map((r) => [`${r.date}:${r.period_id}`, r])
  );
  // 振替先の日付ごとにグルーピング(その日に追加表示するため)
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
        transferToDate: record?.status === "makeup" ? record.makeup_date : null,
      });
    }

    for (const r of transferInByDate.get(iso) ?? []) {
      items.push({
        type: "lesson",
        subject: subjectById.get(r.subject_id) ?? "",
        periodLabel: periodById.get(r.makeup_period_id ?? -1) ?? "",
        status: "makeup_added",
        transferFromDate: r.date,
        transferFromPeriodLabel: periodById.get(r.period_id) ?? "",
      });
    }

    for (const a of announcements.filter((a) => a.event_date === iso)) {
      items.push({
        type: "announcement",
        title: a.title,
        timeRange: a.time_range,
        note: a.note,
      });
    }

    for (const e of schoolEvents.filter((e) => e.event_date === iso)) {
      items.push({ type: "school_event", title: e.title, note: e.note });
    }

    days.push({ date: iso, status, items });
  }

  return days;
}
