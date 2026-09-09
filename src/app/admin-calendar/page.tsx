import { listClosuresForMonth, listAnnouncementsForMonth } from "@/lib/data/announcements";
import { listAllSchoolEventsForMonth } from "@/lib/data/school-events";
import { listSchools } from "@/lib/data/schools";
import { listTodosForMonth } from "@/lib/data/admin-todos";
import { listRecentNotices } from "@/lib/data/notices";
import { getPeriods, getAllPeriodAvailability, getEnrollmentCounts } from "@/lib/data/periods";
import { AdminCalendarView } from "./AdminCalendarView";

export const dynamic = "force-dynamic";

export default async function AdminCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.y ? Number(params.y) : now.getFullYear();
  const month = params.m ? Number(params.m) : now.getMonth() + 1;

  const [closures, announcements, schoolEvents, schools, todos, notices, periods, periodAvailability, enrollmentCountsMap] = await Promise.all([
    listClosuresForMonth(year, month),
    listAnnouncementsForMonth(year, month),
    listAllSchoolEventsForMonth(year, month),
    listSchools(),
    listTodosForMonth(year, month),
    listRecentNotices(20),
    getPeriods(),
    getAllPeriodAvailability(),
    getEnrollmentCounts(),
  ]);
  const enrollmentCounts = Object.fromEntries(enrollmentCountsMap);

  return (
    <AdminCalendarView
      year={year}
      month={month}
      closures={closures}
      announcements={announcements}
      schoolEvents={schoolEvents}
      schools={schools}
      todos={todos}
      notices={notices}
      periods={periods}
      periodAvailability={periodAvailability}
      enrollmentCounts={enrollmentCounts}
    />
  );
}
