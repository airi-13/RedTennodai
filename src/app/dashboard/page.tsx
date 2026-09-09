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

  let days, periods, subjects, students, schools;
  try {
    [days, periods, subjects, students, schools] = await Promise.all([
      buildAdminCalendar(year, month),
      getPeriods(),
      getSubjects(),
      getStudents(),
      listSchools(),
    ]);
  } catch (e) {
    console.error("DashboardPage failed to load data:", e);
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold">カレンダー(全体)</h1>
        <p className="text-sm" style={{ color: "var(--color-absent)" }}>
          読み込み中にエラーが発生しました。時間をおいて再度お試しください。
        </p>
      </div>
    );
  }

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
