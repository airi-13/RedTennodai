import { getPeriods, getAllPeriodAvailability, getEnrollmentCounts } from "@/lib/data/periods";
import { AdminCalendarView } from "./AdminCalendarView";

export const dynamic = "force-dynamic";

// 開講枠(曜日×コマ)と受付人数の管理専用ページ。
// 休講・お知らせ・学校行事・TODOなどの予定は /dashboard(カレンダー全体)で扱う。
export default async function AdminCalendarPage() {
  const [periods, periodAvailability, enrollmentCountsMap] = await Promise.all([
    getPeriods(),
    getAllPeriodAvailability(),
    getEnrollmentCounts(),
  ]);
  const enrollmentCounts = Object.fromEntries(enrollmentCountsMap);

  return (
    <AdminCalendarView
      periods={periods}
      periodAvailability={periodAvailability}
      enrollmentCounts={enrollmentCounts}
    />
  );
}
