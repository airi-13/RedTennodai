"use client";

import { useMemo, useState, useTransition } from "react";
import type { Period, Student, StudentSchedule, Subject } from "@/lib/types";
import {
  addScheduleAction,
  createStudentWithLoginAction,
  removeScheduleAction,
  setStudentActiveAction,
  updateStudentAction,
  bulkUpdateStudentsAction,
  deleteStudentAction,
} from "./actions";
import { isValidEightyMinutePair } from "@/lib/schedule-rules";
import { BulkImport } from "./BulkImport";
import { SpreadsheetStudentEditor } from "./SpreadsheetStudentEditor";
import { scheduleToText } from "@/lib/schedule-text-parser";

const DOW_LABEL = ["日", "月", "火", "水", "木", "金", "土"];
const SCHOOL_LEVEL_PREFIX: Record<string, string> = { 小学生: "小", 中学生: "中", 高校生: "高" };

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

  const subjectById = useMemo(() => new Map(subjects.map((s) => [s.id, s.name])), [subjects]);
  const periodNameById = useMemo(() => new Map(periods.map((p) => [p.id, p.name])), [periods]);

  const editTableRows = useMemo(
    () =>
      visibleStudents.map((s) => {
        const nameParts = s.name.trim().split(/\s+/);
        const kanaParts = (s.name_kana ?? "").trim().split(/\s+/).filter(Boolean);
        const studentSchedules = schedulesByStudent.get(s.id) ?? [];
        const subjectNames = [
          ...new Set(studentSchedules.map((sc) => subjectById.get(sc.subject_id)).filter(Boolean) as string[]),
        ];
        const gradeText = s.school_level && SCHOOL_LEVEL_PREFIX[s.school_level] && s.grade
          ? `${SCHOOL_LEVEL_PREFIX[s.school_level]}${s.grade}`
          : "";
        return [
          s.login_id ?? "",
          s.gender ?? "",
          nameParts[0] ?? "",
          nameParts.slice(1).join(" "),
          kanaParts[0] ?? "",
          kanaParts.slice(1).join(" "),
          s.school_name ?? "",
          gradeText,
          "",
          subjectNames.join(","),
          "",
          scheduleToText(studentSchedules, periodNameById),
        ];
      }),
    [visibleStudents, schedulesByStudent, subjectById, periodNameById]
  );
  // 表の各行がどの生徒かを、位置(何番目か)ではなくIDで対応付ける。
  // 行の削除や空行があっても保存時にズレて別人のデータにならないようにするため。
  const editTableRowIds = useMemo(() => visibleStudents.map((s) => s.id), [visibleStudents]);

  async function saveEditedStudents(rows: string[][], rowIds: (number | null)[]) {
    const gradeMap: Record<string, string> = { 小: "小学生", 中: "中学生", 高: "高校生" };
    const studentById = new Map(visibleStudents.map((s) => [s.id, s]));
    const payload = rows.map((row, index) => {
      const studentId = rowIds[index];
      const student = studentId != null ? studentById.get(studentId) : undefined;
      if (!student) throw new Error(`${index + 1}行目：対象の生徒が見つかりません(表を保存する前にページを再読み込みしてください)`);
      const gradeText = row[7]?.trim() ?? "";
      const m = gradeText.match(/^(小|中|高)(\d+)$/);
      if (!m) throw new Error(`${index + 1}行目：学年「${gradeText}」は「高2」「中3」「小6」の形式で入力してください`);
      return {
        studentId: student.id,
        loginId: student.login_id ?? "",
        gender: row[1]?.trim() || null,
        name: `${row[2].trim()} ${row[3].trim()}`.trim(),
        nameKana: `${row[4]?.trim() ?? ""} ${row[5]?.trim() ?? ""}`.trim() || null,
        schoolName: row[6]?.trim() || null,
        schoolLevel: gradeMap[m[1]],
        grade: Number(m[2]),
        password: row[8]?.trim() || null,
        subjectsText: row[9]?.trim() || null,
        lessonCountText: row[10]?.trim() || null,
        scheduleText: row[11]?.trim() || null,
      };
    });
    const results = await bulkUpdateStudentsAction(payload);
    const failed = results.filter((r) => !r.ok);
    if (failed.length > 0) {
      throw new Error(`${failed.length}件のエラー: ${failed.map((f) => f.error).join(" / ")}`);
    }
  }

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
          退塾済みも表示
        </label>
      </div>

      <BulkImport />
      <AddStudentForm />

      {visibleStudents.length > 0 && (
        <SpreadsheetStudentEditor
          key={visibleStudents.map((s) => s.id).join(",")}
          mode="edit"
          initialRows={editTableRows}
          initialRowIds={editTableRowIds}
          onRegister={saveEditedStudents}
        />
      )}

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
  const [editing, setEditing] = useState(false);
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
              退塾済み
            </span>
          )}
        </button>
        <button
          onClick={() => setEditing((v) => !v)}
          className="text-xs text-[var(--color-ink-soft)] underline"
        >
          {editing ? "編集を閉じる" : "編集"}
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
          {student.status === "active" ? "退塾にする" : "復帰させる"}
        </button>
      </div>

      {editing && (
        <EditStudentForm student={student} onDone={() => setEditing(false)} />
      )}

      {expanded && !editing && (
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

function EditStudentForm({
  student,
  onDone,
}: {
  student: Student;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(student.name);
  const [nameKana, setNameKana] = useState(student.name_kana ?? "");
  const [schoolLevel, setSchoolLevel] = useState(
    student.school_level ?? "小学生"
  );
  const [schoolName, setSchoolName] = useState(student.school_name ?? "");
  const [grade, setGrade] = useState(student.grade ?? 1);
  const [note, setNote] = useState(student.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function submit() {
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateStudentAction(student.id, {
          name: name.trim(),
          name_kana: nameKana.trim() || null,
          school_level: schoolLevel,
          school_name: schoolName.trim() || null,
          grade,
          note: note.trim() || null,
        });
        onDone();
      } catch (e: any) {
        setError(e?.message ?? "更新に失敗しました");
      }
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      try {
        await deleteStudentAction(student.id);
        onDone();
      } catch (e: any) {
        setError(e?.message ?? "削除に失敗しました");
        setConfirmingDelete(false);
      }
    });
  }

  return (
    <div className="mt-3 space-y-3 rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] p-3">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="氏名">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
          />
        </Field>
        <Field label="フリガナ">
          <input
            value={nameKana}
            onChange={(e) => setNameKana(e.target.value)}
            className="rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
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
      <Field label="メモ">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-md border border-[var(--color-border)] px-2 py-1 text-sm"
        />
      </Field>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={submit}
            disabled={isPending || !name.trim()}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: "var(--color-accent)" }}
          >
            保存
          </button>
          <button
            onClick={onDone}
            disabled={isPending}
            className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm disabled:opacity-50"
          >
            キャンセル
          </button>
        </div>

        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            disabled={isPending}
            className="text-xs underline"
            style={{ color: "var(--color-absent)" }}
          >
            この生徒を削除する
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--color-absent)" }}>
              本当に削除しますか？(出欠・スケジュール等も全て削除され、元に戻せません)
            </span>
            <button
              onClick={remove}
              disabled={isPending}
              className="rounded-md px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
              style={{ background: "var(--color-absent)" }}
            >
              削除する
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              disabled={isPending}
              className="text-xs underline"
            >
              やめる
            </button>
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs" style={{ color: "var(--color-absent)" }}>
          {error}
        </p>
      )}
    </div>
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

  const willFormValidPair = useMemo(() => {
    if (!eightyMin) return true;
    const sameDaySubject = (byDay.get(dayOfWeek) ?? []).filter(
      (s) => s.subject_id === subjectId
    );
    const newSort = periodById.get(periodId)?.sort_order;
    if (newSort == null) return true;
    if (sameDaySubject.length === 0) return false;
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
