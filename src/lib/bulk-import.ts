// 生徒一括入力用の12列データを解析する。
// 生徒ID, 性, 姓, 名, ｾｲ, ﾒｲ, 学校, 学年, Pass, 授業科目, 授業数, 授業コマ

export type ParsedStudentRow = {
  raw: string;
  lineNumber: number;
  ok: boolean;
  error?: string;
  data?: {
    loginId: string;
    gender: string | null;
    name: string;
    nameKana: string | null;
    schoolName: string | null;
    schoolLevel: string;
    grade: number;
    password: string;
    subjectsText: string | null;
    lessonCountText: string | null;
    scheduleText: string | null;
  };
};

const GRADE_PREFIX: Record<string, string> = { 小: "小学生", 中: "中学生", 高: "高校生" };

function parseGrade(text: string): { schoolLevel: string; grade: number } | null {
  const m = text.trim().match(/^(小|中|高)(\d+)$/);
  if (!m) return null;
  const schoolLevel = GRADE_PREFIX[m[1]];
  const grade = Number(m[2]);
  if (!schoolLevel || !grade) return null;
  return { schoolLevel, grade };
}

export function parsePastedStudents(text: string): ParsedStudentRow[] {
  const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0);

  return lines.map((line, i) => {
    const cols = line.split("\t").map((c) => c.trim());
    const [loginId, gender, sei, mei, seiKana, meiKana, schoolName, gradeText, password, subjectsText, lessonCountText, scheduleText] = cols;

    // ヘッダー行を貼り付けてもエラーにしない。
    if (loginId === "生徒ID") {
      return { raw: line, lineNumber: i + 1, ok: false, error: "ヘッダー行は登録対象外です" };
    }

    if (!loginId || !sei || !mei || !gradeText || !password) {
      return {
        raw: line,
        lineNumber: i + 1,
        ok: false,
        error: "生徒ID・姓・名・学年・Passのいずれかが空です",
      };
    }

    const gradeParsed = parseGrade(gradeText);
    if (!gradeParsed) {
      return {
        raw: line,
        lineNumber: i + 1,
        ok: false,
        error: `学年の形式が不正です("${gradeText}"。例: 高2, 中3, 小6)`,
      };
    }

    const nameKana = [seiKana, meiKana].filter(Boolean).join(" ") || null;

    return {
      raw: line,
      lineNumber: i + 1,
      ok: true,
      data: {
        loginId,
        gender: gender || null,
        name: `${sei} ${mei}`,
        nameKana,
        schoolName: schoolName || null,
        schoolLevel: gradeParsed.schoolLevel,
        grade: gradeParsed.grade,
        password,
        subjectsText: subjectsText || null,
        lessonCountText: lessonCountText || null,
        scheduleText: scheduleText || null,
      },
    };
  });
}
