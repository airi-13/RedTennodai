// その月の日付ごとの予定(自分の授業・塾のお知らせ・学校行事)を合成する。
import { getSchedulesForStudent } from "@/lib/data/schedules";
import { getPeriods } from "@/lib/data/periods";
import { getSubjects } from "@/lib/data/subjects";
import {
  listAnnouncementsForMonth,
  listClosuresForMonth,
  resolveDayStatus,
} from "@/lib/data/announcements";
import { listSchoolEventsForMonth } from "@/lib/data/school-events";

export type CalendarDayItem =
  | { type: "lesson"; subject: string; periodLabel: string }
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

  const [schedules, periods, subjects, announcements, closures, schoolEvents] =
    await Promise.all([
      getSchedulesForStudent(studentId),
      getPeriods(),
      getSubjects(),
      listAnnouncementsForMonth(year, month),
      listClosuresForMonth(year, month),
      schoolId ? listSchoolEventsForMonth(schoolId, year, month) : Promise.resolve([]),
    ]);

  const periodById = new Map(periods.map((p) => [p.id, p.name]));
  const subjectById = new Map(subjects.map((s) => [s.id, s.name]));

  const daysInMonth = new Date(year, month, 0).getDate();
  const days: CalendarDay[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const status = resolveDayStatus(date, closures);
    const weekday = date.getDay();

    const items: CalendarDayItem[] = [];

    for (const s of schedules.filter((ws) => ws.day_of_week === weekday)) {
      items.push({
        type: "lesson",
        subject: subjectById.get(s.subject_id) ?? "",
        periodLabel: periodById.get(s.period_id) ?? "",
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

  // 注: 振替(makeup_date)を「追加されたコマ」として見分ける表示は別途対応が必要(HANDOFF.md参照)。
  return days;
}
