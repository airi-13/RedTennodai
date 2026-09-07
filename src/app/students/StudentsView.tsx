"use client";

import { useMemo, useState } from "react";
import type { Period, Student, StudentSchedule, Subject } from "@/lib/types";
import {
  saveStudentsTableAction,
  setStudentActiveAction,
  deleteStudentAction,
} from "./actions";
import { SpreadsheetStudentEditor, type StudentStatus } from "./SpreadsheetStudentEditor";
import { scheduleToText } from "@/lib/schedule-text-parser";

const SCHOOL_LEVEL_PREFIX: Record<string, string> = { 小学生: "小", 中学生: "中", 高校生: "高" };

export function StudentsView({
  students,
  schedules,
  periods,
  subjects,
}: {
  students: Student[];
  schedules: StudentSchedule[];
  periods: Period[];
  subjects: Subject[];
}) {
  const [showInactive, setShowInactive] = useState(true);

  const schedulesByStudent = useMemo(() => {
    const map = new Map<number, StudentSchedule[]>();
    for (const s of schedules) {
      const list = map.get(s.student_id) ?? [];
      list.push(s);
      map.set(s.student_id, list);
    }
    return map;
  }, [schedules]);

  const visibleStudents = students.filter((s) => showInactive || s.status === "active");

  const subjectById = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);
  const periodNameById = useMemo(() => new Map(periods.map((p) => [p.id, p.name])), [periods]);

  const editTableRows = useMemo(
    () =>
      visibleStudents.map((s) => {
        const nameParts = s.name.trim().split(/\s+/);
        const kanaParts = (s.name_kana ?? "").trim().split(/\s+/).filter(Boolean);
        const studentSchedules = schedulesByStudent.get(s.id) ?? [];
        const subjectNames = [...new Set(studentSchedules.map((sc) => subjectById.get(sc.subject_id)).filter(Boolean) as string[])];
        const gradeText = s.school_level && SCHOOL_LEVEL_PREFIX[s.school_level] && s.grade ? `${SCHOOL_LEVEL_PREFIX[s.school_level]}${s.grade}` : "";
        return [
          s.login_id ?? "",
          s.gender ?? "",
          nameParts[0] ?? "",
          nameParts.slice(1).join(" "),
          kanaParts[0] ?? "",
          kanaParts.slice(1).join(" "),
          s.school_name ?? "",
          gradeText,
          s.birthdate ?? "",
          "",
          subjectNames.join(","),
          "",
          scheduleToText(studentSchedules, periodNameById),
          s.note ?? "",
        ];
      }),
    [visibleStudents, schedulesByStudent, subjectById, periodNameById]
  );
  const editTableRowIds = useMemo(() => visibleStudents.map((s) => s.id), [visibleStudents]);
  const editTableStatuses = useMemo<StudentStatus[]>(() => visibleStudents.map((s) => s.status), [visibleStudents]);

  async function handleSave(rows: string[][], rowIds: (number | null)[]) {
    const payload = rows.map((row, index) => ({
      studentId: rowIds[index],
      loginId: row[0]?.trim() ?? "",
      gender: row[1]?.trim() || null,
      name: `${row[2]?.trim() ?? ""} ${row[3]?.trim() ?? ""}`.trim(),
      nameKana: `${row[4]?.trim() ?? ""} ${row[5]?.trim() ?? ""}`.trim() || null,
      schoolName: row[6]?.trim() || null,
      gradeText: row[7]?.trim() || null,
      birthdateText: row[8]?.trim() || null,
      password: row[9]?.trim() || null,
      subjectsText: row[10]?.trim() || null,
      lessonCountText: row[11]?.trim() || null,
      scheduleText: row[12]?.trim() || null,
      note: row[13]?.trim() || null,
    }));
    const results = await saveStudentsTableAction(payload);
    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      throw new Error(failed.map((f) => `${f.loginId}: ${f.error}`).join(" / "));
    }
  }

  async function handleToggleActive(studentId: number) {
    const student = visibleStudents.find((s) => s.id === studentId);
    if (!student) return;
    await setStudentActiveAction(studentId, student.status !== "active");
  }

  async function handleDelete(studentId: number) {
    await deleteStudentAction(studentId);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">生徒管理</h1>
        <label className="flex items-center gap-2 text-sm text-[var(--color-ink-soft)]">
          <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
          退塾済みも表示
        </label>
      </div>

      <SpreadsheetStudentEditor
        key={visibleStudents.map((s) => s.id).join(",")}
        initialRows={editTableRows}
        initialRowIds={editTableRowIds}
        initialStatuses={editTableStatuses}
        onSave={handleSave}
        onToggleActive={handleToggleActive}
        onDelete={handleDelete}
      />

      {visibleStudents.length === 0 && (
        <p className="text-center text-sm text-[var(--color-ink-soft)]">生徒が登録されていません</p>
      )}
    </div>
  );
}
