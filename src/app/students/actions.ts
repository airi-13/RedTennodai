"use server";

import { revalidatePath } from "next/cache";
import {
  createStudent,
  createStudentWithLogin,
  updateStudent,
  updateStudentStatus,
  type NewStudent,
  type StudentUpdate,
} from "@/lib/data/students";
import { addSchedule, deleteSchedule } from "@/lib/data/schedules";

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

export async function bulkCreateStudentsAction(
  rows: {
    loginId: string;
    gender: string | null;
    name: string;
    nameKana: string | null;
    schoolName: string | null;
    schoolLevel: string;
    grade: number;
    password: string;
  }[]
): Promise<{ loginId: string; ok: boolean; error?: string }[]> {
  const results: { loginId: string; ok: boolean; error?: string }[] = [];
  for (const row of rows) {
    try {
      await createStudentWithLogin({
        name: row.name,
        name_kana: row.nameKana,
        gender: row.gender,
        school_level: row.schoolLevel,
        school_name: row.schoolName,
        grade: row.grade,
        loginId: row.loginId,
        password: row.password,
      });
      results.push({ loginId: row.loginId, ok: true });
    } catch (e: any) {
      results.push({ loginId: row.loginId, ok: false, error: e?.message ?? "不明なエラー" });
    }
  }
  revalidatePath("/students");
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
