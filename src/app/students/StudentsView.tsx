"use client";

import { useMemo, useState, useTransition } from "react";
import type { Period, Student, StudentSchedule, Subject } from "@/lib/types";
import {
  addScheduleAction,
  createStudentWithLoginAction,
  removeScheduleAction,
  setStudentActiveAction,
} from "./actions";
import { isValidEightyMinutePair } from "@/lib/schedule-rules";
import { BulkImport } from "./BulkImport";

const DOW_LABEL = ["日", "月", "火", "水", "木", "金", "土"];

// 小5以上(小学5・6年、中学、高校の全学年)は80分授業という運用ルール
function needsEightyMinutes(schoolLevel: string | null, grade: number | null) {
  if (schoolLevel === "小学生") return (grade ?? 0) >= 5;
  return schoolLevel === "中学生" || schoolLevel === "高校生";
}

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
  const [showInactive, setShowInactive] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const schedulesByStudent = useMemo(() => {
    const map = new Map<number, StudentSchedule[]>();
    for (const s of schedules) {
      const list = map.get(s.student_id) ?? [];
      list.push(s);
      map.set(s.student_id, list);
    }
    return map;
  }, [schedules]);

  const visibleStudents = students.filter(
    (s) => showInactive || s.status === "active"
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">生徒管理</h1>
        <label className="flex items-center gap-2 text-sm text-[var(--color-ink-soft)]">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          休会中も表示
        </label>
      </div>

      <BulkImport />
      <AddStudentForm />

      <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
        {visibleStudents.map((student) => (
          <StudentRow
            key={student.id}
            student={student}
            schedules={schedulesByStudent.get(student.id) ?? []}
            periods={periods}
            subjects={subjects}
            expanded={expandedId === student.id}
            onToggle={() =>
              setExpandedId(expandedId === student.id ? null : student.id)
            }
          />
        ))}
        {visibleStudents.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-[var(--color-ink-soft)]">
            生徒が登録されていません
          </li>
        )}
      </ul>
    </div>
  );
}

function AddStudentForm() {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [nameKana, setNameKana] = useState("");
  const [schoolLevel, setSchoolLevel] = useState("小学生");
  const [schoolName, setSchoolName] = useState("");
  const [grade, setGrade] = useState(1);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!name.trim() || !loginId.trim() || !password.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await createStudentWithLoginAction({
          name: name.trim(),
          name_kana: nameKana.trim() || null,
          school_level: schoolLevel,
          school_name: schoolName.trim() || null,
          grade,
          loginId: loginId.trim(),
          password,
        });
        setName("");
        setNameKana("");
        setSchoolName("");
        setLoginId("");
        setPassword("");
      } catch (e: any) {
        setError(e?.message ?? "登録に失敗しました");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="氏名">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
            placeholder="山田 太郎"
          />
        </Field>
        <Field label="フリガナ">
          <input
            value={nameKana}
            onChange={(e) => setNameKana(e.target.value)}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
            placeholder="ヤマダ タロウ"
          />
        </Field>
        <Field label="区分">
          <select
            value={schoolLevel}
            onChange={(e) => setSchoolLevel(e.target.value)}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
          >
            <option value="小学生">小学生</option>
            <option value="中学生">中学生</option>
            <option value="高校生">高校生</option>
          </select>
        </Field>
        <Field label="学年">
          <input
            type="number"
            min={1}
            max={6}
            value={grade}
            onChange={(e) => setGrade(Number(e.target.value))}
            className="w-16 rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
          />
        </Field>
        <Field label="学校名">
          <input
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
            placeholder="○○小学校"
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-end gap-2 border-t border-[var(--color-border)] pt-3">
        <Field label="生徒ID(ログイン用)">
          <input
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
            placeholder="例: taro01"
          />
        </Field>
        <Field label="パスワード(ログイン用)">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
            placeholder="生徒に伝えるパスワード"
          />
        </Field>
        <button
          onClick={submit}
          disabled={isPending || !name.trim() || !loginId.trim() || !password.trim()}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: "var(--color-accent)" }}
        >
          追加
        </button>
      </div>
      {error && (
        <p className="text-xs" style={{ color: "var(--color-absent)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-[var(--color-ink-soft)]">
      {label}
      {children}
    </label>
  );
}

function StudentRow({
  student,
  schedules,
  periods,
  subjects,
  expanded,
  onToggle,
}: {
  student: Student;
  schedules: StudentSchedule[];
  periods: Period[];
  subjects: Subject[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const eightyMin = needsEightyMinutes(student.school_level, student.grade);

  return (
    <li className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onToggle} className="flex-1 text-left">
          <span className="font-medium">{student.name}</span>
          <span className="ml-2 text-xs text-[var(--color-ink-soft)]">
            {student.school_level}
            {student.grade ? ` ${student.grade}年` : ""}
            {eightyMin ? "・80分授業" : "・40分授業"}
            {student.login_id && `・ID: ${student.login_id}`}
          </span>
          {student.status === "inactive" && (
            <span className="ml-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
              休会中
            </span>
          )}
        </button>
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(() =>
              setStudentActiveAction(student.id, student.status !== "active")
            )
          }
          className="text-xs text-[var(--color-ink-soft)] underline"
        >
          {student.status === "active" ? "休会にする" : "復会にする"}
        </button>
      </div>

      {expanded && (
        <ScheduleEditor
          student={student}
          schedules={schedules}
          periods={periods}
          subjects={subjects}
          eightyMin={eightyMin}
        />
      )}
    </li>
  );
}

function ScheduleEditor({
  student,
  schedules,
  periods,
  subjects,
  eightyMin,
}: {
  student: Student;
  schedules: StudentSchedule[];
  periods: Period[];
  subjects: Subject[];
  eightyMin: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [periodId, setPeriodId] = useState(periods[0]?.id ?? 0);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? 0);

  const periodById = useMemo(
    () => new Map(periods.map((p) => [p.id, p])),
    [periods]
  );
  const subjectById = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects]
  );

  // 曜日ごとにグループ化して表示
  const byDay = useMemo(() => {
    const map = new Map<number, StudentSchedule[]>();
    for (const s of schedules) {
      const list = map.get(s.day_of_week) ?? [];
      list.push(s);
      map.set(s.day_of_week, list);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) => (periodById.get(a.period_id)?.sort_order ?? 0) -
          (periodById.get(b.period_id)?.sort_order ?? 0)
      );
    }
    return map;
  }, [schedules, periodById]);

  // 追加しようとしているコマが、既存の同曜日・同科目のコマと80分ペアを組めるか警告用に判定
  const willFormValidPair = useMemo(() => {
    if (!eightyMin) return true;
    const sameDaySubject = (byDay.get(dayOfWeek) ?? []).filter(
      (s) => s.subject_id === subjectId
    );
    const newSort = periodById.get(periodId)?.sort_order;
    if (newSort == null) return true;
    if (sameDaySubject.length === 0) return false; // 単独追加はまだペア不成立
    return sameDaySubject.some((s) => {
      const existingSort = periodById.get(s.period_id)?.sort_order;
      return (
        existingSort != null && isValidEightyMinutePair(existingSort, newSort)
      );
    });
  }, [eightyMin, byDay, dayOfWeek, subjectId, periodId, periodById]);

  function addRow() {
    startTransition(async () => {
      await addScheduleAction({
        studentId: student.id,
        dayOfWeek,
        periodId,
        subjectId,
      });
    });
  }

  return (
    <div className="mt-3 rounded-md bg-[var(--color-bg)] p-3">
      <table className="w-full text-sm">
        <tbody>
          {[1, 2, 3, 4, 5, 6, 0].map((dow) => {
            const rows = byDay.get(dow) ?? [];
            if (rows.length === 0) return null;
            return (
              <tr key={dow} className="align-top">
                <td className="w-10 py-1 font-medium">{DOW_LABEL[dow]}</td>
                <td className="py-1">
                  <div className="flex flex-wrap gap-2">
                    {rows.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-0.5"
                      >
                        {periodById.get(s.period_id)?.name}
                        {" "}
                        {subjectById.get(s.subject_id)?.name}
                        <button
                          disabled={isPending}
                          onClick={() =>
                            startTransition(() => removeScheduleAction(s.id))
                          }
                          className="text-[var(--color-ink-soft)] hover:text-[var(--color-absent)]"
                          aria-label="削除"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-[var(--color-border)] pt-3">
        <Field label="曜日">
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(Number(e.target.value))}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
          >
            {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
              <option key={dow} value={dow}>
                {DOW_LABEL[dow]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="コマ">
          <select
            value={periodId}
            onChange={(e) => setPeriodId(Number(e.target.value))}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="科目">
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(Number(e.target.value))}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <button
          onClick={addRow}
          disabled={isPending}
          className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-50"
        >
          このコマを追加
        </button>
      </div>
      {eightyMin && !willFormValidPair && (
        <p className="mt-2 text-xs" style={{ color: "var(--color-late)" }}>
          ⚠ この生徒は80分授業です。単独コマだと同じ曜日・科目でもう1コマ(隣接する①②/③④/⑤⑥/⑦⑧の組)が必要です。登録自体は可能です。
        </p>
      )}
    </div>
  );
}
