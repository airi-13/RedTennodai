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
import { subjectCandidates, parseSchedule, periodNameVariants, needsEightyMinutes } from "@/lib/schedule-text-parser";

const DAY_LABEL = ["日", "月", "火", "水", "木", "金", "土"];

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
// 曜日をまたいでコマをペアにしてしまわないよう、必ず「同じ曜日の中だけ」でペアを組む。
// 80分授業(eightyMinutes=true)は2コマ1組、それ以外(40分授業)は1コマずつ独立して扱う。
// 解釈できないコマ・組めないペアがあった場合は、黙って捨てずに必ずエラーにする
// (「保存しました」と表示されるのにコマが消える、という事故を防ぐため)。
async function buildScheduleRows(
  studentId: number,
  subjectsText: string | null | undefined,
  scheduleText: string | null | undefined,
  subjects: { id: number; name: string; code: string }[],
  periods: { id: number; name: string }[],
  eightyMinutes: boolean
) {
  const subjectTokens = subjectCandidates(subjectsText ?? "");
  const selectedSubjects = subjectTokens
    .map((token) => subjects.find((s) => [s.name, s.code].some((v) => String(v).toLowerCase() === token)))
    .filter(Boolean) as { id: number; name: string; code: string }[];
  const uniqueSubjects = [...new Map(selectedSubjects.map((s) => [s.id, s])).values()];
  const scheduleGroups = parseSchedule(scheduleText ?? null);

  if ((subjectsText?.trim() || scheduleText?.trim()) && (!uniqueSubjects.length || !scheduleGroups.length)) {
    throw new Error("授業科目または授業コマを読み取れませんでした");
  }

  const rows: { student_id: number; day_of_week: number; period_id: number; subject_id: number }[] = [];
  let lessonIndex = 0; // 科目を順番に割り当てるための通し番号(コマのペア、または単独コマごとに1つ進む)

  for (const group of scheduleGroups) {
    const resolvedPeriods = group.periods.map((p) => {
      const found =
        periods.find((per) => periodNameVariants(p).includes(String(per.name))) ||
        periods.find((per) => periodNameVariants(p).includes(String(per.id)));
      if (!found) throw new Error(`授業コマ「${p}」を認識できません`);
      return found;
    });

    if (eightyMinutes) {
      if (resolvedPeriods.length % 2 !== 0) {
        throw new Error(
          `${DAY_LABEL[group.dayOfWeek]}曜日の授業コマが奇数個(${resolvedPeriods.length}個)です。80分授業は2コマ1組で入力してください(例: ①②)`
        );
      }
      for (let i = 0; i + 1 < resolvedPeriods.length; i += 2) {
        const subject = uniqueSubjects.length ? uniqueSubjects[lessonIndex % uniqueSubjects.length] : null;
        if (!subject) continue;
        rows.push({ student_id: studentId, day_of_week: group.dayOfWeek, period_id: resolvedPeriods[i].id, subject_id: subject.id });
        rows.push({ student_id: studentId, day_of_week: group.dayOfWeek, period_id: resolvedPeriods[i + 1].id, subject_id: subject.id });
        lessonIndex++;
      }
    } else {
      for (const period of resolvedPeriods) {
        const subject = uniqueSubjects.length ? uniqueSubjects[lessonIndex % uniqueSubjects.length] : null;
        if (!subject) continue;
        rows.push({ student_id: studentId, day_of_week: group.dayOfWeek, period_id: period.id, subject_id: subject.id });
        lessonIndex++;
      }
    }
  }
  return rows;
}

type TableRow = {
  loginId: string;
  gender: string | null;
  name: string; // 空欄ならloginIdを仮の名前として使う
  nameKana: string | null;
  schoolName: string | null;
  gradeText: string | null; // 「小6」等。空欄可
  birthdateText: string | null; // 「2015-4-1」等。空欄可
  password: string | null; // 新規登録では必須。既存生徒では空欄=変更なし、入力があれば常に上書き
  subjectsText?: string | null;
  lessonCountText?: string | null;
  scheduleText?: string | null;
  note?: string | null;
};

// エラーの原因となった列を表側で赤く示すための識別子。
export type TableRowField = "loginId" | "password" | "grade" | "birthdate" | "schedule";

export type TableRowResult = { loginId: string; ok: boolean; error?: string; field?: TableRowField };

class FieldError extends Error {
  field: TableRowField;
  constructor(message: string, field: TableRowField) {
    super(message);
    this.field = field;
  }
}

// 生徒一覧の表(新規行・既存行が混在)をまとめて保存する。
// 表側の行位置やIDには頼らず、必ず「生徒ID(login_id)」でその都度DBを検索して
// 既存/新規を判定する。これにより、行の追加・削除・貼り付けで対応がズレる事故を防ぐ。
// 生徒IDが既存のものと一致すれば、その生徒の更新として扱う(Passも含めて上書きでよく、
// 現在と同じ値でもエラーにしない)。一致しなければ新規作成(Passが必須)。
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
    const loginId = row.loginId?.trim() ?? "";
    try {
      if (!loginId) {
        throw new FieldError("生徒IDは必須です", "loginId");
      }

      let schoolLevel: string | null;
      let grade: number | null;
      let birthdate: string | null;
      try {
        ({ schoolLevel, grade } = parseGradeText(row.gradeText));
      } catch (e: any) {
        throw new FieldError(e.message, "grade");
      }
      try {
        birthdate = parseBirthdateText(row.birthdateText);
      } catch (e: any) {
        throw new FieldError(e.message, "birthdate");
      }

      const { data: existing, error: findError } = await supabase
        .from("students")
        .select("id, auth_user_id, school_level, grade")
        .eq("login_id", loginId)
        .maybeSingle();
      if (findError) throw findError;

      if (!existing) {
        // 新規作成: 生徒IDに加えてPassも必須。
        if (!row.password?.trim()) {
          throw new FieldError("新規登録にはPassが必要です", "password");
        }
        const student = await createStudentWithLogin({
          name: row.name.trim() || loginId,
          name_kana: row.nameKana,
          gender: row.gender,
          birthdate,
          school_level: schoolLevel,
          school_name: row.schoolName,
          grade,
          note: row.note ?? null,
          loginId,
          password: row.password.trim(),
        });
        try {
          const scheduleRows = await buildScheduleRows(
            student.id,
            row.subjectsText,
            row.scheduleText,
            subjects,
            periods,
            needsEightyMinutes(schoolLevel, grade)
          );
          for (const s of scheduleRows) {
            await addSchedule({ student_id: s.student_id, day_of_week: s.day_of_week, period_id: s.period_id, subject_id: s.subject_id });
          }
        } catch (e: any) {
          throw new FieldError(e.message, "schedule");
        }
      } else {
        // 既存生徒の更新。生徒ID(login_id)は変更しない(表側でも読み取り専用にしている)。
        await updateStudent(existing.id, {
          name: row.name.trim() || loginId,
          name_kana: row.nameKana,
          gender: row.gender,
          birthdate,
          school_level: schoolLevel,
          school_name: row.schoolName,
          grade,
          note: row.note ?? null,
        });

        if (row.password?.trim()) {
          if (!existing.auth_user_id) {
            throw new FieldError("ログイン未発行の生徒のパスワードは変更できません", "password");
          }
          // 現在と同じパスワードでもエラーにせず、そのまま上書き登録する。
          await updateStudentPassword(existing.auth_user_id, row.password.trim());
        }

        if (row.subjectsText?.trim() || row.scheduleText?.trim()) {
          // 学年欄が空欄(変更なし)の場合、80分/40分授業の判定には現在の学年情報を使う
          const effectiveSchoolLevel = row.gradeText?.trim() ? schoolLevel : existing.school_level ?? null;
          const effectiveGrade = row.gradeText?.trim() ? grade : existing.grade ?? null;
          try {
            const scheduleRows = await buildScheduleRows(
              existing.id,
              row.subjectsText,
              row.scheduleText,
              subjects,
              periods,
              needsEightyMinutes(effectiveSchoolLevel, effectiveGrade)
            );
            await deleteSchedulesForStudent(existing.id);
            for (const s of scheduleRows) {
              await addSchedule({ student_id: s.student_id, day_of_week: s.day_of_week, period_id: s.period_id, subject_id: s.subject_id });
            }
          } catch (e: any) {
            throw new FieldError(e.message, "schedule");
          }
        }
      }

      results.push({ loginId, ok: true });
    } catch (e: any) {
      results.push({
        loginId: loginId || "(生徒ID未入力)",
        ok: false,
        error: e?.message ?? "不明なエラー",
        field: e instanceof FieldError ? e.field : undefined,
      });
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
