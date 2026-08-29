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
import { supabase } from "@/lib/supabase";

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

const SUBJECT_ALIASES: Record<string, string[]> = {
  "英": ["英", "英語"],
  "数": ["数", "数学"],
  "数Ⅰ": ["数Ⅰ", "数学Ⅰ", "数1"],
  "数Ⅱ": ["数Ⅱ", "数学Ⅱ", "数2"],
  "算": ["算", "算数"],
  "国": ["国", "国語"],
  QUREO: ["QUREO"],
  DOJO: ["DOJO"],
};

function subjectCandidates(text: string) {
  return text.split(",").map((s) => s.trim()).filter(Boolean).flatMap((token) => {
    const aliases = SUBJECT_ALIASES[token] ?? [token];
    return aliases.map((name) => name.toLowerCase());
  });
}

function parseSchedule(text: string | null): { dayOfWeek: number; periods: string[] }[] {
  if (!text?.trim()) return [];
  const dayMap: Record<string, number> = { 日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6 };
  const matches = [...text.matchAll(/([日月火水木金土]+)([①②③④⑤⑥⑦⑧]+)/g)];
  return matches.flatMap((m) => {
    const days = [...m[1]].map((d) => dayMap[d]).filter((d) => d !== undefined);
    const periods = [...m[2]];
    return days.map((dayOfWeek) => ({ dayOfWeek, periods }));
  });
}

function periodNameVariants(name: string) {
  const n = name.trim();
  const arabic = { "①": "1", "②": "2", "③": "3", "④": "4", "⑤": "5", "⑥": "6", "⑦": "7", "⑧": "8" }[n];
  return [n, arabic].filter(Boolean) as string[];
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

      const subjectTokens = subjectCandidates(row.subjectsText ?? "");
      const selectedSubjects = subjectTokens.map((token) => subjects.find((s: any) => [s.name, s.code].some((v) => String(v).toLowerCase() === token))).filter(Boolean) as any[];
      const uniqueSubjects = [...new Map(selectedSubjects.map((s) => [s.id, s])).values()];
      const scheduleGroups = parseSchedule(row.scheduleText ?? null);
      const slots = scheduleGroups.flatMap((group) => group.periods.map((period) => ({ dayOfWeek: group.dayOfWeek, period })));

      if ((row.subjectsText?.trim() || row.scheduleText?.trim()) && (!uniqueSubjects.length || !slots.length)) {
        throw new Error("授業科目または授業コマを読み取れませんでした");
      }

      // 80分授業は2コマで1授業として扱う。複数科目の場合は授業ペアを順番に割り当てる。
      for (let i = 0; i + 1 < slots.length; i += 2) {
        const subject = uniqueSubjects.length ? uniqueSubjects[Math.floor(i / 2) % uniqueSubjects.length] : null;
        if (!subject) continue;
        const first = periods.find((p: any) => periodNameVariants(slots[i].period).includes(String(p.name))) || periods.find((p: any) => periodNameVariants(slots[i].period).includes(String(p.id)));
        const second = periods.find((p: any) => periodNameVariants(slots[i + 1].period).includes(String(p.name))) || periods.find((p: any) => periodNameVariants(slots[i + 1].period).includes(String(p.id)));
        if (!first || !second) throw new Error(`授業コマ「${slots[i].period}${slots[i + 1].period}」を認識できません`);
        await addSchedule({ student_id: student.id, day_of_week: slots[i].dayOfWeek, period_id: first.id, subject_id: subject.id });
        await addSchedule({ student_id: student.id, day_of_week: slots[i + 1].dayOfWeek, period_id: second.id, subject_id: subject.id });
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
