import { buildAdminCalendar } from "@/lib/data/calendar";
import { getPeriods } from "@/lib/data/periods";
import { getSubjects } from "@/lib/data/subjects";
import { getStudents } from "@/lib/data/students";
import { listSchools } from "@/lib/data/schools";
import { DashboardView } from "./DashboardView";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.y ? Number(params.y) : now.getFullYear();
  const month = params.m ? Number(params.m) : now.getMonth() + 1;

  const [days, periods, subjects, students, schools] = await Promise.all([
    buildAdminCalendar(year, month),
    getPeriods(),
    getSubjects(),
    getStudents(),
    listSchools(),
  ]);

  return (
    <DashboardView
      year={year}
      month={month}
      days={days}
      periods={periods}
      subjects={subjects}
      students={students}
      schools={schools}
    />
  );
}
