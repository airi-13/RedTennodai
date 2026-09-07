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

// 学年欄(「小6」「中2」「高1」等)を区分+学年に分解する。空欄なら両方nullを返す。
// 欄に何か入っているのに形式が違う場合だけエラーにする(未入力は許可する)。
function parseGradeText(gradeText: string | null | undefined): { schoolLevel: string | null; grade: number | null } {
  const text = gradeText?.trim() ?? "";
  if (!text) return { schoolLevel: null, grade: null };
  const gradeMap: Record<string, string> = { 小: "小学生", 中: "中学生", 高: "高校生" };
  const m = text.match(/^(小|中|高)(\d+)$/);
  if (!m) throw new Error(`学年「${text}」は「高2」「中3」「小6」の形式で入力してください(未入力も可)`);
  return { schoolLevel: gradeMap[m[1]], grade: Number(m[2]) };
}

// 生年月日欄を正規化する。空欄ならnull。全角/半角のスラッシュ・ハイフン両方を受け付ける。
function parseBirthdateText(text: string | null | undefined): string | null {
  const t = (text ?? "").trim().replace(/\//g, "-").replace(/年|月/g, "-").replace(/日/g, "");
  if (!t) return null;
  const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) throw new Error(`生年月日「${text}」は「2015-4-1」のような形式で入力してください(未入力も可)`);
  return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
}

// 授業科目テキスト・授業コマテキストから、そのまま student_schedules へ追加できる形に変換する。
// 新規登録・既存編集の両方で使う共通処理。両方とも空欄なら何もしない(スケジュール未設定/維持)。
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

type TableRow = {
  studentId: number | null; // nullなら新規作成
  loginId: string;
  gender: string | null;
  name: string; // 空欄ならloginIdを仮の名前として使う
  nameKana: string | null;
  schoolName: string | null;
  gradeText: string | null; // 「小6」等。空欄可
  birthdateText: string | null; // 「2015-4-1」等。空欄可
  password: string | null; // 新規行では必須。既存行では空欄=変更なし
  subjectsText?: string | null;
  lessonCountText?: string | null;
  scheduleText?: string | null;
  note?: string | null;
};

export type TableRowResult = { loginId: string; ok: boolean; error?: string };

// 生徒一覧の表(新規行・既存行が混在)をまとめて保存する。
// studentIdが無い行は新規作成(生徒ID・Passのみ必須)、ある行は更新として扱う。
export async function saveStudentsTableAction(rows: TableRow[]): Promise<TableRowResult[]> {
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

  const results: TableRowResult[] = [];

  for (const row of rows) {
    try {
      const { schoolLevel, grade } = parseGradeText(row.gradeText);
      const birthdate = parseBirthdateText(row.birthdateText);

      if (row.studentId == null) {
        // 新規作成: 生徒ID・Passのみ必須。それ以外は空欄可。
        if (!row.loginId.trim() || !row.password?.trim()) {
          throw new Error("生徒IDとPassは必須です");
        }
        const student = await createStudentWithLogin({
          name: row.name.trim() || row.loginId.trim(),
          name_kana: row.nameKana,
          gender: row.gender,
          birthdate,
          school_level: schoolLevel,
          school_name: row.schoolName,
          grade,
          note: row.note ?? null,
          loginId: row.loginId.trim(),
          password: row.password.trim(),
        });
        const scheduleRows = await buildScheduleRows(student.id, row.subjectsText, row.scheduleText, subjects, periods);
        for (const s of scheduleRows) {
          await addSchedule({ student_id: s.student_id, day_of_week: s.day_of_week, period_id: s.period_id, subject_id: s.subject_id });
        }
      } else {
        // 既存生徒の更新。生徒IDはここでは変更しない(表側でも読み取り専用にしている)。
        await updateStudent(row.studentId, {
          name: row.name.trim() || row.loginId.trim(),
          name_kana: row.nameKana,
          gender: row.gender,
          birthdate,
          school_level: schoolLevel,
          school_name: row.schoolName,
          grade,
          note: row.note ?? null,
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
      }

      results.push({ loginId: row.loginId, ok: true });
    } catch (e: any) {
      results.push({ loginId: row.loginId || "(生徒ID未入力)", ok: false, error: e?.message ?? "不明なエラー" });
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
