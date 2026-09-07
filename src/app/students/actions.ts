"use server";

import { revalidatePath } from "next/cache";
import {
  createStudent,
  createStudentWithLogin,
  updateStudent,
  updateStudentStatus,
  updateStudentPassword,
  deleteStudent,
  type NewStudent,
  type StudentUpdate,
} from "@/lib/data/students";
import { addSchedule, deleteSchedule, deleteSchedulesForStudent } from "@/lib/data/schedules";
import { supabase } from "@/lib/supabase";
import { subjectCandidates, parseSchedule, periodNameVariants } from "@/lib/schedule-text-parser";

export async function createStudentAction(input: NewStudent) {
  const student = await createStudent(input);
  revalidatePath("/students");
  return student;
}

export async function createStudentWithLoginAction(
  input: NewStudent & { loginId: string; password: string }
) {
  const student = await createStudentWithLogin(input);
  revalidatePath("/students");
  return student;
}

type BulkRow = {
  loginId: string;
  gender: string | null;
  name: string;
  nameKana: string | null;
  schoolName: string | null;
  schoolLevel: string;
  grade: number;
  password: string;
  subjectsText?: string | null;
  lessonCountText?: string | null;
  scheduleText?: string | null;
};

// 授業科目テキスト・授業コマテキストから、そのまま student_schedules へ追加できる形に変換する。
// 新規登録・既存編集の両方で使う共通処理。
async function buildScheduleRows(
  studentId: number,
  subjectsText: string | null | undefined,
  scheduleText: string | null | undefined,
  subjects: { id: number; name: string; code: string }[],
  periods: { id: number; name: string }[]
) {
  const subjectTokens = subjectCandidates(subjectsText ?? "");
  const selectedSubjects = subjectTokens
    .map((token) => subjects.find((s) => [s.name, s.code].some((v) => String(v).toLowerCase() === token)))
    .filter(Boolean) as { id: number; name: string; code: string }[];
  const uniqueSubjects = [...new Map(selectedSubjects.map((s) => [s.id, s])).values()];
  const scheduleGroups = parseSchedule(scheduleText ?? null);
  const slots = scheduleGroups.flatMap((group) => group.periods.map((period) => ({ dayOfWeek: group.dayOfWeek, period })));

  if ((subjectsText?.trim() || scheduleText?.trim()) && (!uniqueSubjects.length || !slots.length)) {
    throw new Error("授業科目または授業コマを読み取れませんでした");
  }

  const rows: { student_id: number; day_of_week: number; period_id: number; subject_id: number }[] = [];
  // 80分授業は2コマで1授業として扱う。複数科目の場合は授業ペアを順番に割り当てる。
  for (let i = 0; i + 1 < slots.length; i += 2) {
    const subject = uniqueSubjects.length ? uniqueSubjects[Math.floor(i / 2) % uniqueSubjects.length] : null;
    if (!subject) continue;
    const first = periods.find((p) => periodNameVariants(slots[i].period).includes(String(p.name))) || periods.find((p) => periodNameVariants(slots[i].period).includes(String(p.id)));
    const second = periods.find((p) => periodNameVariants(slots[i + 1].period).includes(String(p.name))) || periods.find((p) => periodNameVariants(slots[i + 1].period).includes(String(p.id)));
    if (!first || !second) throw new Error(`授業コマ「${slots[i].period}${slots[i + 1].period}」を認識できません`);
    rows.push({ student_id: studentId, day_of_week: slots[i].dayOfWeek, period_id: first.id, subject_id: subject.id });
    rows.push({ student_id: studentId, day_of_week: slots[i + 1].dayOfWeek, period_id: second.id, subject_id: subject.id });
  }
  return rows;
}

export async function bulkCreateStudentsAction(
  rows: BulkRow[]
): Promise<{ loginId: string; ok: boolean; error?: string }[]> {
  const { data: subjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id,name,code")
    .order("sort_order");
  if (subjectsError) throw subjectsError;

  const { data: periods, error: periodsError } = await supabase
    .from("periods")
    .select("id,name")
    .order("sort_order");
  if (periodsError) throw periodsError;

  const results: { loginId: string; ok: boolean; error?: string }[] = [];
  for (const row of rows) {
    try {
      const student = await createStudentWithLogin({
        name: row.name,
        name_kana: row.nameKana,
        gender: row.gender,
        school_level: row.schoolLevel,
        school_name: row.schoolName,
        grade: row.grade,
        loginId: row.loginId,
        password: row.password,
      });

      const scheduleRows = await buildScheduleRows(student.id, row.subjectsText, row.scheduleText, subjects, periods);
      for (const s of scheduleRows) {
        await addSchedule({ student_id: s.student_id, day_of_week: s.day_of_week, period_id: s.period_id, subject_id: s.subject_id });
      }

      results.push({ loginId: row.loginId, ok: true });
    } catch (e: any) {
      results.push({ loginId: row.loginId, ok: false, error: e?.message ?? "不明なエラー" });
    }
  }
  revalidatePath("/students");
  revalidatePath("/attendance");
  return results;
}

type BulkEditRow = {
  studentId: number;
  loginId: string;
  gender: string | null;
  name: string;
  nameKana: string | null;
  schoolName: string | null;
  schoolLevel: string;
  grade: number;
  password?: string | null; // 空なら変更しない
  subjectsText?: string | null; // 空なら授業予定を変更しない
  lessonCountText?: string | null;
  scheduleText?: string | null;
};

// 既存生徒を表形式でまとめて編集する。Pass欄が空の行はパスワードを変更せず、
// 授業科目・授業コマの両方が空の行は現在のスケジュールをそのまま維持する
// (どちらか一方でも入力されていれば、その生徒のスケジュールを表の内容で丸ごと置き換える)。
export async function bulkUpdateStudentsAction(
  rows: BulkEditRow[]
): Promise<{ loginId: string; ok: boolean; error?: string }[]> {
  const { data: subjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id,name,code")
    .order("sort_order");
  if (subjectsError) throw subjectsError;

  const { data: periods, error: periodsError } = await supabase
    .from("periods")
    .select("id,name")
    .order("sort_order");
  if (periodsError) throw periodsError;

  const results: { loginId: string; ok: boolean; error?: string }[] = [];
  for (const row of rows) {
    try {
      await updateStudent(row.studentId, {
        name: row.name,
        name_kana: row.nameKana,
        gender: row.gender,
        school_level: row.schoolLevel,
        school_name: row.schoolName,
        grade: row.grade,
      });

      if (row.password?.trim()) {
        const { data: student, error } = await supabase
          .from("students")
          .select("auth_user_id")
          .eq("id", row.studentId)
          .single();
        if (error) throw error;
        if (!student?.auth_user_id) throw new Error("ログイン未発行の生徒のパスワードは変更できません");
        await updateStudentPassword(student.auth_user_id, row.password.trim());
      }

      if (row.subjectsText?.trim() || row.scheduleText?.trim()) {
        const scheduleRows = await buildScheduleRows(row.studentId, row.subjectsText, row.scheduleText, subjects, periods);
        await deleteSchedulesForStudent(row.studentId);
        for (const s of scheduleRows) {
          await addSchedule({ student_id: s.student_id, day_of_week: s.day_of_week, period_id: s.period_id, subject_id: s.subject_id });
        }
      }

      results.push({ loginId: row.loginId, ok: true });
    } catch (e: any) {
      results.push({ loginId: row.loginId, ok: false, error: e?.message ?? "不明なエラー" });
    }
  }
  revalidatePath("/students");
  revalidatePath("/attendance");
  revalidatePath("/my");
  return results;
}

export async function updateStudentAction(id: number, input: StudentUpdate) {
  const student = await updateStudent(id, input);
  revalidatePath("/students");
  revalidatePath("/attendance");
  revalidatePath("/my");
  return student;
}

export async function setStudentActiveAction(id: number, active: boolean) {
  await updateStudentStatus(id, active ? "active" : "inactive");
  revalidatePath("/students");
  revalidatePath("/attendance");
}

export async function deleteStudentAction(id: number) {
  await deleteStudent(id);
  revalidatePath("/students");
  revalidatePath("/attendance");
  revalidatePath("/my");
}

export async function addScheduleAction(input: {
  studentId: number;
  dayOfWeek: number;
  periodId: number;
  subjectId: number;
}) {
  await addSchedule({
    student_id: input.studentId,
    day_of_week: input.dayOfWeek,
    period_id: input.periodId,
    subject_id: input.subjectId,
  });
  revalidatePath("/students");
  revalidatePath("/attendance");
}

export async function removeScheduleAction(id: number) {
  await deleteSchedule(id);
  revalidatePath("/students");
  revalidatePath("/attendance");
}
