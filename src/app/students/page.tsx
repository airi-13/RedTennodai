import { getStudents } from "@/lib/data/students";
import { getAllSchedules } from "@/lib/data/schedules";
import { getPeriods } from "@/lib/data/periods";
import { getSubjects } from "@/lib/data/subjects";
import { StudentsView } from "./StudentsView";

export const dynamic = "force-dynamic";

export default async function StudentsPage() {
  const [students, schedules, periods, subjects] = await Promise.all([
    getStudents(true), // 休会中も含めて表示(画面側で切り替え)
    getAllSchedules(),
    getPeriods(),
    getSubjects(),
  ]);

  return (
    <StudentsView
      students={students}
      schedules={schedules}
      periods={periods}
      subjects={subjects}
    />
  );
}
