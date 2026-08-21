import { getPeriods, getPeriodAvailabilityForDay } from "@/lib/data/periods";
import { getSubjects } from "@/lib/data/subjects";
import { getAttendanceSlotsForDate, dayOfWeekFromDateString } from "@/lib/data/attendance";
import { AttendanceView } from "./AttendanceView";

export const dynamic = "force-dynamic";

// サーバーのタイムゾーンに依存せず、日本時間での「今日」をYYYY-MM-DDで返す
function todayInJst(): string {
  return new Date()
    .toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" }) // sv-SEロケールはYYYY-MM-DD形式になる
    .slice(0, 10);
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date = params.date ?? todayInJst();
  const dayOfWeek = dayOfWeekFromDateString(date);

  const [periods, subjects, availability, slots] = await Promise.all([
    getPeriods(),
    getSubjects(),
    getPeriodAvailabilityForDay(dayOfWeek),
    getAttendanceSlotsForDate(date),
  ]);

  const openPeriodIds = new Set(
    availability.filter((a) => a.is_open).map((a) => a.period_id)
  );
  // 受付可否がopenの枠 + 実際に予定/記録がある枠 は表示する(設定変更後も既存の予定を隠さないため)
  const slotPeriodIds = new Set(slots.map((s) => s.periodId));
  const visiblePeriods = periods.filter(
    (p) => openPeriodIds.has(p.id) || slotPeriodIds.has(p.id)
  );

  return (
    <AttendanceView
      date={date}
      dayOfWeek={dayOfWeek}
      periods={visiblePeriods}
      subjects={subjects}
      slots={slots}
    />
  );
}
